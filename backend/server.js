require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(cors());
app.use(express.json());

// MySQL数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST ,
  user: process.env.DB_USER ,
  password: process.env.DB_PASSWORD ,
  database: process.env.DB_NAME ,
};

// 创建数据库连接池
let db;

async function connectDB() {
  try {
    console.log('Attempting to connect to MySQL with config:', {
      host: dbConfig.host,
      user: dbConfig.user,
      database: dbConfig.database,
      password: '*** (hidden)'
    });
    
    // 首先创建连接以检查数据库是否存在
    const connection = await mysql.createConnection({
      host: dbConfig.host,
      user: dbConfig.user,
      password: dbConfig.password
    });
    
    console.log('Successfully connected to MySQL server.');
    
    // 创建数据库（如果不存在）
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
    console.log(`Database '${dbConfig.database}' checked/created.`);
    await connection.end();
    
    // 连接到数据库
    db = await mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    
    console.log('Connected to MySQL database.');
    
    // 创建lists表
    await db.execute(`CREATE TABLE IF NOT EXISTS lists (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(255) NOT NULL,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`);
    console.log('Lists table created or already exists.');
    
    // 创建items表
    await db.execute(`CREATE TABLE IF NOT EXISTS items (
      id INT PRIMARY KEY AUTO_INCREMENT,
      text TEXT NOT NULL,
      listId INT DEFAULT 1,
      isHidden TINYINT DEFAULT 0,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (listId) REFERENCES lists(id) ON DELETE SET NULL
    )`);
    console.log('Items table created or already exists.');
    
    // 添加默认列表
    const [rows] = await db.execute(`SELECT * FROM lists WHERE id = 1`);
    if (rows.length === 0) {
      await db.execute(`INSERT INTO lists (id, name) VALUES (1, '默认列表')`);
      console.log('Default list created.');
    }
  } catch (err) {
    console.error('Database error details:', {
      message: err.message,
      code: err.code,
      errno: err.errno,
      sqlMessage: err.sqlMessage,
      sqlState: err.sqlState
    });
    process.exit(1);
  }
}

// 连接数据库
connectDB();

// API 路由

// 获取所有列表
app.get('/api/lists', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM lists ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建新列表
app.post('/api/lists', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const sql = 'INSERT INTO lists (name) VALUES (?)';
    const [result] = await db.execute(sql, [name.trim()]);
    res.json({
      id: result.insertId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新列表
app.put('/api/lists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || name.trim() === '') {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const sql = 'UPDATE lists SET name = ? WHERE id = ?';
    const [result] = await db.execute(sql, [name.trim(), id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    res.json({
      id: parseInt(id),
      name: name.trim(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除列表
app.delete('/api/lists/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // 不能删除默认列表
    if (parseInt(id) === 1) {
      res.status(400).json({ error: 'Cannot delete default list' });
      return;
    }
    
    // 先将该列表的所有条目移动到默认列表
    await db.execute('UPDATE items SET listId = 1 WHERE listId = ?', [id]);
    
    // 然后删除列表
    const sql = 'DELETE FROM lists WHERE id = ?';
    const [result] = await db.execute(sql, [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'List not found' });
      return;
    }
    res.json({ message: 'List deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取所有条目
app.get('/api/items', async (req, res) => {
  try {
    const { listId } = req.query;
    let sql = 'SELECT * FROM items';
    const params = [];
    
    if (listId) {
      sql += ' WHERE listId = ?';
      params.push(listId);
    }
    
    sql += ' ORDER BY id DESC';
    
    const [rows] = await db.execute(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 创建新条目
app.post('/api/items', async (req, res) => {
  try {
    console.log('收到创建条目请求:', req.body);
    const { text, listId = 1, isHidden = 0 } = req.body;
    if (!text || text.trim() === '') {
      console.log('创建条目失败: 文本内容不能为空');
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const sql = 'INSERT INTO items (text, listId, isHidden) VALUES (?, ?, ?)';
    const [result] = await db.execute(sql, [text.trim(), listId, isHidden]);
    console.log('创建条目成功，ID:', result.insertId);
    res.json({
      id: result.insertId,
      text: text.trim(),
      listId,
      isHidden,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('创建条目数据库错误:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// 更新条目
app.put('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, listId, isHidden } = req.body;
    
    if (!text || text.trim() === '') {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    // 构建更新字段和参数
    const updateFields = [];
    const params = [];
    
    updateFields.push('text = ?');
    params.push(text.trim());
    
    if (listId !== undefined) {
      updateFields.push('listId = ?');
      params.push(listId);
    }
    
    if (isHidden !== undefined) {
      updateFields.push('isHidden = ?');
      params.push(isHidden);
    }
    
    params.push(id);
    
    const sql = `UPDATE items SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const [result] = await db.execute(sql, params);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    
    // 返回更新后的完整条目
    const [rows] = await db.execute('SELECT * FROM items WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 删除条目
app.delete('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const sql = 'DELETE FROM items WHERE id = ?';
    const [result] = await db.execute(sql, [id]);
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Item not found' });
      return;
    }
    res.json({ message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// 关闭数据库连接
process.on('SIGINT', async () => {
  try {
    await db.end();
    console.log('Closed the database connection.');
    process.exit(0);
  } catch (err) {
    console.error('Error closing database connection:', err.message);
    process.exit(1);
  }
});