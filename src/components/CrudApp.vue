<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

// 定义数据结构
const items = ref([])
const newItem = ref('')
const editingId = ref(null)
const editingText = ref('')
const selectedItem = ref(null)

// 后端API地址 - 使用相对路径确保在任何环境都能正确连接
const API_BASE_URL = '/api'

// 从后端加载数据
const loadItems = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/items`)
    items.value = response.data
  } catch (error) {
    console.error('加载数据失败:', error)
  }
}

// 添加新条目
const addItem = async () => {
  if (newItem.value.trim()) {
    try {
      const response = await axios.post(`${API_BASE_URL}/items`, {
        text: newItem.value.trim()
      })
      items.value.unshift(response.data)
      newItem.value = ''
    } catch (error) {
      console.error('添加数据失败:', error)
    }
  }
}

// 开始编辑条目
const startEdit = (item) => {
  editingId.value = item.id
  editingText.value = item.text
}

// 保存编辑
const saveEdit = async () => {
  if (editingText.value.trim()) {
    try {
      const response = await axios.put(`${API_BASE_URL}/items/${editingId.value}`, {
        text: editingText.value.trim()
      })
      const index = items.value.findIndex(i => i.id === editingId.value)
      if (index !== -1) {
        items.value[index] = response.data
      }
      editingId.value = null
      editingText.value = ''
    } catch (error) {
      console.error('编辑数据失败:', error)
    }
  }
}

// 取消编辑
const cancelEdit = () => {
  editingId.value = null
  editingText.value = ''
}

// 删除条目
const deleteItem = async (id) => {
  try {
    await axios.delete(`${API_BASE_URL}/items/${id}`)
    items.value = items.value.filter(i => i.id !== id)
  } catch (error) {
    console.error('删除数据失败:', error)
  }
}

// 随机抽取条目
const randomSelect = () => {
  if (items.value.length > 0) {
    const randomIndex = Math.floor(Math.random() * items.value.length)
    selectedItem.value = items.value[randomIndex]
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadItems()
})
</script>

<template>
  <div class="crud-app">
    <h1>CRUD 表单与随机抽取</h1>
    
    <!-- 添加新条目 -->
    <div class="add-section">
      <h2>添加新条目</h2>
      <input 
        v-model="newItem" 
        type="text" 
        placeholder="输入新条目内容"
        @keyup.enter="addItem"
      />
      <button @click="addItem">添加</button>
    </div>
    
    <!-- 条目列表 -->
    <div class="list-section">
      <h2>条目列表</h2>
      <button @click="randomSelect" class="random-btn">随机抽取</button>
      
      <ul class="items-list">
        <li v-for="item in items" :key="item.id" class="item">
          <div v-if="editingId === item.id" class="edit-form">
            <input v-model="editingText" type="text" />
            <button @click="saveEdit">保存</button>
            <button @click="cancelEdit">取消</button>
          </div>
          <div v-else class="item-content">
            <span>{{ item.text }}</span>
            <div class="item-actions">
              <button @click="startEdit(item)">编辑</button>
              <button @click="deleteItem(item.id)">删除</button>
            </div>
          </div>
        </li>
      </ul>
      
      <p v-if="items.length === 0" class="empty-message">暂无条目，请添加</p>
    </div>
    
    <!-- 随机抽取结果 -->
    <div v-if="selectedItem" class="result-section">
      <h2>抽取结果</h2>
      <div class="selected-item">
        {{ selectedItem.text }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.crud-app {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

h1 {
  text-align: center;
  color: #333;
}

h2 {
  color: #555;
  margin-top: 20px;
}

.add-section {
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.add-section input {
  padding: 10px;
  width: 70%;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
}

button {
  padding: 10px 15px;
  background-color: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 5px;
}

button:hover {
  background-color: #35495e;
}

.list-section {
  margin-bottom: 30px;
}

.random-btn {
  background-color: #6495ED;
  margin-bottom: 15px;
}

.random-btn:hover {
  background-color: #4169E1;
}

.items-list {
  list-style: none;
  padding: 0;
}

.item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.edit-form {
  display: flex;
  align-items: center;
  width: 100%;
}

.edit-form input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-right: 10px;
  flex: 1;
}

.item-actions button {
  padding: 5px 10px;
  font-size: 12px;
}

.item-actions button:last-child {
  background-color: #ff6b6b;
}

.item-actions button:last-child:hover {
  background-color: #ee5a52;
}

.empty-message {
  text-align: center;
  color: #888;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.result-section {
  padding: 20px;
  background-color: #f0fff4;
  border-radius: 8px;
  border: 2px solid #42b883;
}

.selected-item {
  font-size: 24px;
  text-align: center;
  padding: 20px;
  color: #333;
  font-weight: bold;
  background-color: white;
  border-radius: 4px;
  margin-top: 10px;
}
</style>