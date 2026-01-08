import axios from 'axios'

// 后端API地址 - 使用相对路径确保在任何环境都能正确连接
const API_BASE_URL = '/api'

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 条目相关API
const itemApi = {
  // 获取所有条目
  getAllItems: async () => {
    try {
      const response = await apiClient.get('/items')
      return response.data
    } catch (error) {
      console.error('获取条目列表失败:', error)
      throw error
    }
  },

  // 获取指定列表的条目
  getItemsByListId: async (listId) => {
    try {
      const response = await apiClient.get(`/items?listId=${listId}`)
      return response.data
    } catch (error) {
      console.error('获取指定列表的条目失败:', error)
      throw error
    }
  },

  // 创建新条目
  createItem: async (itemData) => {
    try {
      const response = await apiClient.post('/items', itemData)
      return response.data
    } catch (error) {
      console.error('创建条目失败:', error)
      throw error
    }
  },

  // 更新条目
  updateItem: async (id, itemData) => {
    try {
      const response = await apiClient.put(`/items/${id}`, itemData)
      return response.data
    } catch (error) {
      console.error('更新条目失败:', error)
      throw error
    }
  },

  // 删除条目
  deleteItem: async (id) => {
    try {
      const response = await apiClient.delete(`/items/${id}`)
      return response.data
    } catch (error) {
      console.error('删除条目失败:', error)
      throw error
    }
  },

  // 获取所有列表
  getAllLists: async () => {
    try {
      const response = await apiClient.get('/lists')
      return response.data
    } catch (error) {
      console.error('获取列表列表失败:', error)
      throw error
    }
  },

  // 创建新列表
  createList: async (listData) => {
    try {
      const response = await apiClient.post('/lists', listData)
      return response.data
    } catch (error) {
      console.error('创建列表失败:', error)
      throw error
    }
  },

  // 更新列表
  updateList: async (id, listData) => {
    try {
      const response = await apiClient.put(`/lists/${id}`, listData)
      return response.data
    } catch (error) {
      console.error('更新列表失败:', error)
      throw error
    }
  },

  // 删除列表
  deleteList: async (id) => {
    try {
      const response = await apiClient.delete(`/lists/${id}`)
      return response.data
    } catch (error) {
      console.error('删除列表失败:', error)
      throw error
    }
  }
}

export default itemApi
