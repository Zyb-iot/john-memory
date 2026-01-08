<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  StarFilled, Star, Plus, EditPen, Delete, List, 
  FolderOpened, CirclePlus, Hide, View 
} from '@element-plus/icons-vue'
import itemApi from '../api/itemApi'

// 数据结构
const lists = ref([])
const items = ref([])
const newItem = ref('')
const newListName = ref('')
const editingItem = ref(null)
const editingList = ref(null)
const selectedListId = ref(1)
const isListDialogVisible = ref(false)
const isEditItemDialogVisible = ref(false)
const isEditListDialogVisible = ref(false)
const isResultDialogVisible = ref(false)
const selectedItem = ref(null)
const tableRowExpanded = ref({})
const isSidebarOpen = ref(false)

// 计算属性
const filteredItems = computed(() => {
  return items.value.filter(item => item.listId === selectedListId.value)
})

const visibleItemsForRandom = computed(() => {
  return items.value.filter(item => item.listId === selectedListId.value && !item.isHidden)
})

// 加载所有列表
const loadLists = async () => {
  try {
    const data = await itemApi.getAllLists()
    lists.value = data
  } catch (error) {
    ElMessage.error('加载列表失败')
    console.error('加载列表失败:', error)
  }
}

// 加载所有条目
const loadItems = async () => {
  try {
    const data = await itemApi.getAllItems()
    items.value = data
  } catch (error) {
    ElMessage.error('加载条目失败')
    console.error('加载条目失败:', error)
  }
}

// 添加新条目
const addItem = async () => {
  if (!newItem.value.trim()) {
    ElMessage.warning('请输入条目内容')
    return
  }
  
  try {
    const itemData = {
      text: newItem.value.trim(),
      listId: selectedListId.value
    }
    const newItemData = await itemApi.createItem(itemData)
    items.value.unshift(newItemData)
    newItem.value = ''
    ElMessage.success('添加成功')
  } catch (error) {
    ElMessage.error('添加失败')
    console.error('添加条目失败:', error)
  }
}

// 打开编辑条目对话框
const openEditItemDialog = (item) => {
  editingItem.value = { ...item }
  isEditItemDialogVisible.value = true
}

// 保存编辑条目
const saveEditItem = async () => {
  if (!editingItem.value.text.trim()) {
    ElMessage.warning('请输入条目内容')
    return
  }
  
  try {
    const updatedItem = await itemApi.updateItem(editingItem.value.id, editingItem.value)
    const index = items.value.findIndex(i => i.id === updatedItem.id)
    if (index !== -1) {
      items.value[index] = updatedItem
    }
    isEditItemDialogVisible.value = false
    ElMessage.success('编辑成功')
  } catch (error) {
    ElMessage.error('编辑失败')
    console.error('编辑条目失败:', error)
  }
}

// 删除条目
const deleteItem = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这个条目吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await itemApi.deleteItem(id)
    items.value = items.value.filter(item => item.id !== id)
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error('删除条目失败:', error)
    }
  }
}

// 切换条目隐藏状态
const toggleItemHidden = async (item) => {
  try {
    const updatedItem = await itemApi.updateItem(item.id, {
      ...item,
      isHidden: item.isHidden ? 0 : 1
    })
    const index = items.value.findIndex(i => i.id === updatedItem.id)
    if (index !== -1) {
      items.value[index] = updatedItem
    }
    ElMessage.success(`条目已${updatedItem.isHidden ? '隐藏' : '显示'}`)
  } catch (error) {
    ElMessage.error('操作失败')
    console.error('切换隐藏状态失败:', error)
  }
}

// 添加新列表
const addList = async () => {
  if (!newListName.value.trim()) {
    ElMessage.warning('请输入列表名称')
    return
  }
  
  try {
    const listData = await itemApi.createList({ name: newListName.value.trim() })
    lists.value.push(listData)
    newListName.value = ''
    isListDialogVisible.value = false
    ElMessage.success('创建列表成功')
  } catch (error) {
    ElMessage.error('创建列表失败')
    console.error('创建列表失败:', error)
  }
}

// 打开编辑列表对话框
const openEditListDialog = (list) => {
  editingList.value = { ...list }
  isEditListDialogVisible.value = true
}

// 保存编辑列表
const saveEditList = async () => {
  if (!editingList.value.name.trim()) {
    ElMessage.warning('请输入列表名称')
    return
  }
  
  try {
    const updatedList = await itemApi.updateList(editingList.value.id, editingList.value)
    const index = lists.value.findIndex(l => l.id === updatedList.id)
    if (index !== -1) {
      lists.value[index] = updatedList
    }
    isEditListDialogVisible.value = false
    ElMessage.success('编辑成功')
  } catch (error) {
    ElMessage.error('编辑失败')
    console.error('编辑列表失败:', error)
  }
}

// 删除列表
const deleteList = async (listId) => {
  if (listId === 1) {
    ElMessage.warning('不能删除默认列表')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要删除这个列表吗？该列表的所有条目将移动到默认列表', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await itemApi.deleteList(listId)
    lists.value = lists.value.filter(list => list.id !== listId)
    
    // 如果当前选中的列表被删除，切换到默认列表
    if (selectedListId.value === listId) {
      selectedListId.value = 1
    }
    
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error('删除列表失败:', error)
    }
  }
}

// 切换选中列表
const changeList = (listId) => {
  selectedListId.value = listId
  // 折叠所有行
  tableRowExpanded.value = {}
}

// 随机抽取条目
const randomSelect = () => {
  const visibleItems = visibleItemsForRandom.value
  
  if (visibleItems.length === 0) {
    ElMessage.warning('当前列表中没有可抽取的条目')
    return
  }
  
  const randomIndex = Math.floor(Math.random() * visibleItems.length)
  selectedItem.value = visibleItems[randomIndex]
  isResultDialogVisible.value = true
}

// 组件挂载时加载数据
onMounted(() => {
  loadLists()
  loadItems()
})
</script>

<template>
  <div class="crud-app">
    <!-- 页面容器 -->
    <div class="app-container">
      <!-- 页面头部 -->
      <header class="app-header">
        <div class="header-content">
          <div class="header-left">
            <el-button 
              link 
              :icon="List" 
              @click="isSidebarOpen = true"
              class="sidebar-toggle-btn"
            >
              列表
            </el-button>
            <div class="header-brand">
              <el-icon class="brand-icon"><StarFilled /></el-icon>
              <h1 class="app-title">随机抽取</h1>
            </div>
          </div>
          <div class="header-actions">
            <el-button 
              type="primary" 
              size="large" 
              @click="randomSelect" 
              :disabled="visibleItemsForRandom.length === 0"
              :class="['random-btn', { 'btn-disabled': visibleItemsForRandom.length === 0 }]"
            >
              <el-icon class="icon"><StarFilled /></el-icon>
              <span class="random-text">抽取</span>
              <span class="btn-badge">({{ visibleItemsForRandom.length }}/{{ filteredItems.length }})</span>
            </el-button>
          </div>
        </div>
      </header>

      <!-- 主要内容区 -->
      <main class="main-content">
        <!-- 左侧边栏：列表管理（移动端抽屉式） -->
        <el-drawer
          v-model="isSidebarOpen"
          direction="left"
          size="85%"
          class="list-drawer"
        >
          <div class="sidebar-wrapper">
            <div class="sidebar-header">
              <h3 class="sidebar-title">列表管理</h3>
              <el-button 
                type="primary" 
                size="small" 
                :icon="Plus" 
                @click="isListDialogVisible = true"
                class="add-list-btn"
              >
                新建列表
              </el-button>
            </div>
            
            <div class="lists-container">
              <el-card
                v-for="list in lists"
                :key="list.id"
                :class="{ 'active-list': list.id === selectedListId.value }"
                class="list-card"
                shadow="hover"
                @click="changeList(list.id); isSidebarOpen = false"
              >
                <template #header>
                  <div class="card-header">
                    <span class="list-name">{{ list.name }}</span>
                    <div class="card-actions">
                      <el-button 
                        link 
                        size="small" 
                        :icon="EditPen" 
                        @click="openEditListDialog(list); isSidebarOpen = false"
                      />
                      <el-button 
                        link 
                        size="small" 
                        :icon="Delete"
                        @click="deleteList(list.id)" 
                        :disabled="list.id === 1"
                        :class="{ 'disabled-btn': list.id === 1 }"
                      />
                    </div>
                  </div>
                </template>
                <div class="list-info">
                  <span class="item-count">
                    <el-icon><List /></el-icon>
                    {{ items.filter(item => item.listId === list.id).length }}
                  </span>
                  <el-button 
                    type="primary" 
                    size="small" 
                    @click="changeList(list.id); randomSelect(); isSidebarOpen = false"
                    class="quick-select-btn"
                  >
                    <el-icon><Star /></el-icon>
                    抽取
                  </el-button>
                </div>
              </el-card>
            </div>
          </div>
        </el-drawer>

        <!-- 内容区：条目管理 -->
        <section class="content-section">
          <!-- 当前列表信息卡片 -->
          <el-card class="info-card">
            <div class="list-info-header">
              <h2 class="current-list-title">
                <el-icon class="icon"><FolderOpened /></el-icon>
                {{ lists.find(list => list.id === selectedListId.value)?.name }}
              </h2>
              <div class="list-stats">
                <el-tag size="small" class="stat-tag">
                  <el-icon><List /></el-icon>
                  条目总数: {{ filteredItems.length }}
                </el-tag>
                <el-tag type="success" size="small" class="stat-tag">
                  <el-icon><Star /></el-icon>
                  可抽取: {{ visibleItemsForRandom.length }}
                </el-tag>
              </div>
            </div>
          </el-card>

          <!-- 添加新条目卡片 -->
          <el-card class="add-item-card">
            <div class="add-item-section">
              <el-input 
                v-model="newItem" 
                placeholder="输入新条目内容"
                @keyup.enter="addItem"
                clearable
                :prefix-icon="CirclePlus"
                class="new-item-input"
              />
              <el-button 
                type="success" 
                @click="addItem"
                :disabled="!newItem.trim()"
                class="add-item-btn"
              >
                <el-icon><Plus /></el-icon>
                添加条目
              </el-button>
            </div>
          </el-card>

          <!-- 条目列表卡片 -->
          <el-card class="items-table-card">
            <template #header>
              <div class="table-header">
                <h3 class="table-title">条目管理</h3>
              </div>
            </template>
            
            <el-table 
              v-if="filteredItems.length > 0" 
              :data="filteredItems" 
              style="width: 100%"
              :row-key="row => row.id"
              stripe
              border
              class="items-table mobile-table"
            >
              <el-table-column prop="text" label="内容" min-width="200">
                <template #default="scope">
                  <div class="item-text">
                    <span :class="{ 'hidden-text': scope.row.isHidden }">
                      {{ scope.row.text }}
                    </span>
                    <el-tag 
                      v-if="scope.row.isHidden" 
                      type="warning" 
                      size="small"
                      class="hidden-tag"
                    >
                      已隐藏
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" align="center" fixed="right">
                <template #default="scope">
                  <div class="table-actions">
                    <el-button 
                      type="primary" 
                      size="small" 
                      @click="openEditItemDialog(scope.row)"
                      class="table-btn"
                    >
                      <el-icon><EditPen /></el-icon>
                    </el-button>
                    <el-button 
                      :type="scope.row.isHidden ? 'success' : 'warning'" 
                      size="small" 
                      @click="toggleItemHidden(scope.row)"
                      class="table-btn"
                    >
                      <el-icon :component="scope.row.isHidden ? View : Hide" />
                    </el-button>
                    <el-button 
                      type="danger" 
                      size="small" 
                      @click="deleteItem(scope.row.id)"
                      class="table-btn"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </div>
                </template>
              </el-table-column>
            </el-table>
            
            <el-empty v-else description="暂无条目，请添加" class="empty-state" />
          </el-card>
        </section>
      </main>
    </div>
    
    <!-- 创建列表对话框 -->
    <el-dialog
      v-model="isListDialogVisible"
      title="创建新列表"
      width="400px"
      custom-class="custom-dialog"
      destroy-on-close
    >
      <el-input v-model="newListName" placeholder="输入列表名称" />
      <template #footer>
        <el-button @click="isListDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addList">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 编辑条目对话框 -->
    <el-dialog
      v-model="isEditItemDialogVisible"
      title="编辑条目"
      width="400px"
      custom-class="custom-dialog"
      destroy-on-close
    >
      <el-form label-width="80px">
        <el-form-item label="内容">
          <el-input v-model="editingItem.text" placeholder="输入条目内容" />
        </el-form-item>
        <el-form-item label="列表">
          <el-select v-model="editingItem.listId" placeholder="选择列表">
            <el-option
              v-for="list in lists"
              :key="list.id"
              :label="list.name"
              :value="list.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="隐藏">
          <el-switch v-model="editingItem.isHidden" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="isEditItemDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEditItem">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 编辑列表对话框 -->
    <el-dialog
      v-model="isEditListDialogVisible"
      title="编辑列表"
      width="400px"
      custom-class="custom-dialog"
      destroy-on-close
    >
      <el-input v-model="editingList.name" placeholder="输入列表名称" />
      <template #footer>
        <el-button @click="isEditListDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEditList">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 随机抽取结果对话框 -->
    <el-dialog
      v-model="isResultDialogVisible"
      title="抽取结果"
      width="400px"
      custom-class="custom-dialog result-dialog"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <div class="result-content">
        <h3>{{ selectedItem?.text }}</h3>
        <div class="result-info">
          <p>来自列表: {{ lists.find(list => list.id === selectedItem?.listId)?.name }}</p>
          <p>抽取时间: {{ new Date().toLocaleString() }}</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="isResultDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="randomSelect">再抽一次</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
/* 全局样式 */
.crud-app {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  animation: fadeIn 0.5s ease;
  line-height: 1.6;
}

/* 全局动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 页面容器 */
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  max-width: 1600px;
  margin: 0 auto;
  width: 100%;
  padding: 0 24px;
}

/* 页面头部 */
.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  color: #303133;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
  padding: 20px 0;
  z-index: 100;
  border-radius: 0 0 20px 20px;
  margin-bottom: 20px;
}

.header-content {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sidebar-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  color: #667eea;
  padding: 8px 12px;
  margin-right: 5px;
}

.random-text {
  display: none;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  animation: fadeInUp 0.6s ease;
}

.brand-icon {
  color: #667eea;
  font-size: 32px;
  animation: pulse 2s infinite;
}

.app-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  letter-spacing: 0.5px;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.random-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  animation: fadeInUp 0.6s ease 0.2s both;
}

.random-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.random-btn:active {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 加载状态 */
.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .app-container {
    padding: 0 15px;
  }
}

@media (max-width: 992px) {
  .main-content {
    flex-direction: column;
  }
  
  .content-section {
    padding: 0;
  }
}

/* 移动端表格样式 */
.mobile-table {
  font-size: 14px;
}

.table-actions {
  display: flex;
  justify-content: center;
  gap: 5px;
}

.table-btn {
  padding: 5px 10px;
  min-width: auto;
}

/* 抽屉式侧边栏样式 */
.list-drawer {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.list-drawer .el-drawer__body {
  padding: 0;
  height: 100%;
  overflow-y: auto;
}

.list-drawer .list-card {
  margin-bottom: 15px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.list-drawer .active-list {
  border-left: 4px solid #667eea;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
}

@media (max-width: 768px) {
  .app-header {
    padding: 15px 0;
  }
  
  .app-title {
    font-size: 24px;
  }
  
  .random-btn {
    width: 100%;
    justify-content: center;
  }
  
  .list-info-header {
    flex-direction: column;
    gap: 15px;
    text-align: center;
    padding: 20px;
  }
  
  .add-item-section {
    flex-direction: column;
    gap: 15px;
    padding: 20px;
  }
  
  .new-item-input {
    width: 100%;
  }
  
  .add-item-btn {
    width: 100%;
    justify-content: center;
  }
  
  .items-table-card {
    overflow-x: auto;
  }
  
  .el-table {
    width: 100%;
    min-width: 600px;
  }
  
  .el-dialog {
    margin: 10px;
    width: calc(100% - 20px) !important;
    max-width: 100%;
  }
  
  .result-content h3 {
    font-size: 24px;
  }
}

@media (max-width: 480px) {
  .app-container {
    padding: 0 10px;
  }
  
  .sidebar-wrapper {
    padding: 20px;
  }
  
  .list-info-header {
    padding: 15px;
  }
  
  .current-list-title {
    font-size: 20px;
  }
  
  .add-item-card {
    padding: 15px;
  }
  
  .el-dialog__body {
    padding: 20px;
  }
}

.random-btn .icon {
  font-size: 20px;
  animation: pulse 1.5s ease-in-out infinite;
}

.btn-badge {
  background-color: rgba(255, 255, 255, 0.25);
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.btn-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2) !important;
}

/* 自定义弹窗样式 */
.custom-dialog {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-dialog .el-dialog__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px 24px;
  border-radius: 16px 16px 0 0;
}

.custom-dialog .el-dialog__title {
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.custom-dialog .el-dialog__close {
  color: white;
  font-size: 20px;
  transition: all 0.3s ease;
}

.custom-dialog .el-dialog__close:hover {
  color: rgba(255, 255, 255, 0.8);
  transform: scale(1.2);
}

.custom-dialog .el-dialog__body {
  padding: 24px;
  background: white;
}

.custom-dialog .el-dialog__footer {
  padding: 0 24px 24px;
  background: white;
  border-radius: 0 0 16px 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 抽取结果弹窗特殊样式 */
.result-dialog {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
}

.result-dialog .el-dialog__body {
  padding: 32px;
}

.result-content {
  text-align: center;
  animation: fadeInUp 0.5s ease;
}

.result-content h3 {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 24px;
  color: #303133;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1.4;
}

.result-info {
  background: #f8f9ff;
  padding: 16px;
  border-radius: 12px;
  margin-top: 24px;
  border: 1px solid #e4e7ed;
}

.result-info p {
  margin: 8px 0;
  color: #606266;
  font-size: 14px;
}

/* 弹窗表单样式 */
.custom-dialog .el-form {
  max-width: 100%;
}

.custom-dialog .el-form-item {
  margin-bottom: 20px;
}

.custom-dialog .el-form-item__label {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.custom-dialog .el-input,
.custom-dialog .el-select {
  width: 100%;
}

.custom-dialog .el-input__wrapper {
  border-radius: 10px;
  transition: all 0.3s ease;
}

.custom-dialog .el-input__wrapper:focus-within {
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
}

.custom-dialog .el-button {
  border-radius: 10px;
  padding: 8px 20px;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-dialog .el-button--primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.custom-dialog .el-button--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.custom-dialog .el-button--primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

/* 主要内容区布局 */
.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  gap: 24px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
  animation: fadeInUp 0.6s ease 0.3s both;
}

/* 左侧边栏 */
.sidebar {
  width: 320px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  animation: slideInLeft 0.6s ease 0.4s both;
}

.sidebar:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.sidebar-wrapper {
  padding: 24px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f0f2f5;
  animation: fadeInUp 0.6s ease 0.4s both;
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.add-list-btn {
  border-radius: 10px;
  font-size: 12px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  font-weight: 500;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.add-list-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.add-list-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(102, 126, 234, 0.3);
}

.lists-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow-y: auto;
  flex: 1;
  padding-right: 6px;
  animation: fadeInUp 0.6s ease 0.5s both;
}

.list-card {
  border-radius: 12px;
  border: 2px solid transparent;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  background: white;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: relative;
  overflow: hidden;
}

.list-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  transform: scaleX(0);
  transition: transform 0.3s ease;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
  transition: background 0.3s ease;
}

::-webkit-scrollbar-thumb:hover {
  background: #a1a1a1;
}

/* 对话框动画 */
.el-dialog {
  animation: scaleIn 0.3s ease;
  border-radius: 16px;
  overflow: hidden;
}

.el-dialog__header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 16px 16px 0 0;
}

.el-dialog__title {
  color: white;
  font-weight: 600;
}

.el-dialog__body {
  padding: 24px;
}

.list-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.2);
  border-color: rgba(102, 126, 234, 0.3);
}

.list-card:hover::before {
  transform: scaleX(1);
}

.list-card.active-list {
  border-color: #667eea;
  box-shadow: 0 8px 24px rgba(102, 126, 234, 0.25);
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
}

.list-card.active-list::before {
  transform: scaleX(1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.list-name {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-actions .el-button {
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
}

.card-actions .el-button:hover {
  color: #667eea;
}

.disabled-btn {
  cursor: not-allowed;
  opacity: 0.5;
}

.list-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
  font-size: 12px;
}

.item-count {
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
}

.quick-select-btn {
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 右侧内容区 */
.content-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
  overflow-y: auto;
  padding: 0 0 24px 0;
  animation: slideInRight 0.6s ease 0.5s both;
}

/* 列表信息卡片 */
.info-card, .list-info-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
  overflow: hidden;
  animation: fadeInUp 0.6s ease 0.6s both;
  transition: all 0.3s ease;
}

.info-card:hover, .list-info-card:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.list-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
}

.current-list-title {
  font-size: 24px;
  font-weight: 700;
  margin: 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 12px;
}

.current-list-title .icon {
  font-size: 28px;
  color: #667eea;
  animation: pulse 2s infinite;
}

.current-list-title .icon {
  color: #667eea;
  font-size: 20px;
}

.list-stats {
  display: flex;
  gap: 12px;
}

.list-stats .stat-tag {
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 12px;
  background-color: #f5f7fa;
  border: 1px solid #e4e7ed;
}

/* 添加条目卡片 */
.add-item-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease 0.7s both;
}

.add-item-card:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.add-item-section {
  display: flex;
  gap: 15px;
  align-items: center;
  padding: 25px;
}

.new-item-input {
  flex: 1;
  border-radius: 12px;
  border: 2px solid #e4e7ed;
  transition: all 0.3s ease;
  font-size: 14px;
  padding: 12px 16px;
  background: white;
}

.new-item-input:focus {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
  transform: translateY(-1px);
}

.add-item-btn {
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 500;
  padding: 12px 20px;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
}

.add-item-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
}

.add-item-btn:active {
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(102, 126, 234, 0.3);
}

.add-item-btn:disabled {
  transform: none;
  box-shadow: none;
  opacity: 0.6;
}

/* 条目列表卡片 */
.items-table-card {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  flex: 1;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: none;
  overflow: hidden;
  animation: fadeInUp 0.6s ease 0.8s both;
  transition: all 0.3s ease;
  margin-bottom: 20px;
}

.items-table-card:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
}

.table-header {
  padding: 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f0f2f5;
}

.table-header h3 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.el-table {
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  border: none;
  background: white;
  flex: 1;
}

.el-table .el-table__header-wrapper .el-table__header {
  background-color: #f8f9fa;
  border-radius: 0;
}

.el-table th {
  font-weight: 600;
  color: #303133;
  background-color: #f8f9fa;
  border-bottom: 2px solid #e4e7ed;
  padding: 14px 16px;
  font-size: 14px;
  text-align: left;
  transition: background-color 0.3s ease;
}

.el-table th:hover {
  background-color: #f1f3f5;
}

.el-table td {
  padding: 16px;
  font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
  text-align: left;
}

.el-table tr {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.el-table tr:hover {
  background-color: #f8f9ff;
  transform: translateX(5px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
}

.el-table tr:hover .table-btn {
  opacity: 1;
}

.el-table tr.hidden-row {
  background-color: #fafafa;
  opacity: 0.8;
  transition: all 0.3s ease;
}

.el-table tr.hidden-row:hover {
  background-color: #f5f5f5;
}

.el-table__body-wrapper {
  border-radius: 0 0 12px 12px;
  overflow: hidden;
  flex: 1;
}

.expanded-content {
  padding: 16px;
  background-color: #fafafa;
  border-radius: 8px;
  margin: 8px 0;
  border-left: 4px solid #667eea;
}

.expanded-item {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  align-items: center;
}

.expanded-item:last-child {
  margin-bottom: 0;
}

.expanded-item .label {
  color: #606266;
  font-weight: 500;
  min-width: 90px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.expanded-item .value {
  color: #303133;
  flex: 1;
  font-size: 13px;
}

.hidden-text {
  text-decoration: line-through;
  color: #909399;
  font-style: italic;
  transition: all 0.3s ease;
  opacity: 0.7;
}

.hidden-tag {
  animation: pulse 1.5s ease-in-out infinite;
}

/* 添加条目内容和标签的间距 */
.item-text {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.table-btn {
  opacity: 0;
  transition: opacity 0.3s ease, transform 0.3s ease;
  padding: 4px 10px;
  border-radius: 6px;
  margin: 0 2px;
  font-size: 12px;
}

.table-btn:hover {
  transform: translateY(-2px);
}

.el-table__empty-text {
  font-size: 14px;
  color: #909399;
  padding: 40px 20px;
  font-weight: 500;
}

/* 表格操作按钮组 */
.table-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.table-btn {
  margin: 0 4px;
  border-radius: 6px;
  font-size: 12px;
  padding: 4px 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s ease;
  border: none;
  opacity: 0.8;
}

.table-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.table-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* 弹窗样式 */
.result-content {
  text-align: center;
  padding: 40px 30px;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
  border-radius: 12px;
  margin: 0 20px;
}

.result-content h3 {
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 24px;
  color: #667eea;
  line-height: 1.4;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.result-info {
  color: #606266;
  font-size: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid rgba(102, 126, 234, 0.2);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .sidebar-content {
    padding: 15px;
  }
  
  .app-main {
    padding: 15px;
  }
}

@media (max-width: 768px) {
  .el-container {
    flex-direction: column;
  }
  
  .app-header {
    padding: 15px;
  }
  
  .header-content {
    padding: 0;
    flex-direction: column;
    gap: 15px;
    text-align: center;
  }
  
  .app-title {
    justify-content: center;
  }
  
  .app-sidebar {
    width: 100% !important;
    height: auto;
    max-height: 300px;
  }
  
  .lists-container {
    flex-direction: row;
    flex-wrap: wrap;
  }
  
  .list-card {
    width: calc(50% - 6px);
  }
  
  .add-item-section {
    flex-direction: column;
    gap: 10px;
  }
  
  .new-item-input {
    width: 100%;
  }
  
  .add-item-btn {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 480px) {
  .app-main {
    padding: 10px;
  }
  
  .list-card {
    width: 100%;
  }
  
  .list-info-header {
    flex-direction: column;
    gap: 10px;
    align-items: flex-start;
  }
  
  .list-stats {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .table-btn {
    margin: 4px 2px;
  }
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>