<script setup>
import { ref, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  StarFilled, Star, Plus, EditPen, Delete, CirclePlus, Hide, View, FolderOpened 
} from '@element-plus/icons-vue'
import itemApi from '../api/itemApi'

// 数据
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

// 计算属性
const filteredItems = computed(() => items.value.filter(i => i.listId === selectedListId.value))
const visibleItemsForRandom = computed(() => filteredItems.value.filter(i => !i.isHidden))

// 加载列表和条目
const loadLists = async () => {
  try { lists.value = await itemApi.getAllLists() } 
  catch { ElMessage.error('加载列表失败') }
}
const loadItems = async () => {
  try { items.value = await itemApi.getAllItems() } 
  catch { ElMessage.error('加载条目失败') }
}

// 添加条目
const addItem = async () => {
  if (!newItem.value.trim()) return ElMessage.warning('请输入条目内容')
  try {
    const newData = await itemApi.createItem({ text: newItem.value.trim(), listId: selectedListId.value })
    items.value.unshift(newData)
    newItem.value = ''
    ElMessage.success('添加成功')
  } catch { ElMessage.error('添加失败') }
}

// 编辑条目
const openEditItemDialog = (item) => { editingItem.value = { ...item }; isEditItemDialogVisible.value = true }
const saveEditItem = async () => {
  if (!editingItem.value.text.trim()) return ElMessage.warning('请输入条目内容')
  try {
    const updated = await itemApi.updateItem(editingItem.value.id, editingItem.value)
    const idx = items.value.findIndex(i => i.id === updated.id)
    if (idx !== -1) items.value[idx] = updated
    isEditItemDialogVisible.value = false
    ElMessage.success('编辑成功')
  } catch { ElMessage.error('编辑失败') }
}

// 删除条目
const deleteItem = async (id) => {
  try {
    await ElMessageBox.confirm('确定删除此条目？', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await itemApi.deleteItem(id)
    items.value = items.value.filter(i => i.id !== id)
    ElMessage.success('删除成功')
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

// 隐藏/显示条目
const toggleItemHidden = async (item) => {
  try {
    const updated = await itemApi.updateItem(item.id, { ...item, isHidden: item.isHidden ? 0 : 1 })
    const idx = items.value.findIndex(i => i.id === updated.id)
    if (idx !== -1) items.value[idx] = updated
    ElMessage.success(`条目已${updated.isHidden ? '隐藏' : '显示'}`)
  } catch { ElMessage.error('操作失败') }
}

// 列表操作
const addList = async () => {
  if (!newListName.value.trim()) return ElMessage.warning('请输入列表名称')
  try { 
    const newList = await itemApi.createList({ name: newListName.value.trim() })
    lists.value.push(newList)
    newListName.value = ''
    isListDialogVisible.value = false
    ElMessage.success('创建成功')
  } catch { ElMessage.error('创建失败') }
}

const openEditListDialog = (list) => { editingList.value = { ...list }; isEditListDialogVisible.value = true }
const saveEditList = async () => {
  if (!editingList.value.name.trim()) return ElMessage.warning('请输入列表名称')
  try {
    const updated = await itemApi.updateList(editingList.value.id, editingList.value)
    const idx = lists.value.findIndex(l => l.id === updated.id)
    if (idx !== -1) lists.value[idx] = updated
    isEditListDialogVisible.value = false
    ElMessage.success('编辑成功')
  } catch { ElMessage.error('编辑失败') }
}

const deleteList = async (listId) => {
  if (listId === 1) return ElMessage.warning('默认列表不可删除')
  try {
    await ElMessageBox.confirm('删除列表？条目将转到默认列表', '提示', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await itemApi.deleteList(listId)
    lists.value = lists.value.filter(l => l.id !== listId)
    if (selectedListId.value === listId) selectedListId.value = 1
    ElMessage.success('删除成功')
  } catch (e) { if (e !== 'cancel') ElMessage.error('删除失败') }
}

const changeList = (id) => selectedListId.value = id

// 随机抽取
const randomSelect = () => {
  if (!visibleItemsForRandom.value.length) return ElMessage.warning('无可抽取条目')
  const idx = Math.floor(Math.random() * visibleItemsForRandom.value.length)
  selectedItem.value = visibleItemsForRandom.value[idx]
  isResultDialogVisible.value = true
}

onMounted(() => { loadLists(); loadItems() })
</script>

<template>
  <div class="mobile-crud">
    <!-- 头部 -->
    <header class="mobile-header">
      <h1>随机抽取系统</h1>
      <el-button type="primary" @click="randomSelect" :disabled="!visibleItemsForRandom.length">
        <el-icon><StarFilled/></el-icon> 随机抽取
      </el-button>
    </header>

    <!-- 列表选择 -->
    <section class="mobile-lists">
      <el-button type="primary" @click="isListDialogVisible = true">
        <el-icon><Plus/></el-icon> 新建列表
      </el-button>
      <div class="list-cards">
        <el-card 
          v-for="list in lists" :key="list.id" :shadow="list.id === selectedListId ? 'hover' : 'never'" 
          class="list-card" @click="changeList(list.id)"
        >
          <div class="list-header">
            <span>{{ list.name }}</span>
            <div class="actions">
              <el-button @click.stop="openEditListDialog(list)">
                <el-icon><EditPen/></el-icon>
              </el-button>
              <el-button @click.stop="deleteList(list.id)" :disabled="list.id===1">
                <el-icon><Delete/></el-icon>
              </el-button>
            </div>
          </div>
          <p>条目: {{ items.filter(i=>i.listId===list.id).length }}</p>
        </el-card>
      </div>
    </section>

    <!-- 条目管理 -->
    <section class="mobile-items">
      <el-input v-model="newItem" placeholder="新条目" clearable @keyup.enter="addItem">
        <template #prefix>
          <el-icon><CirclePlus/></el-icon>
        </template>
      </el-input>
      <el-button type="success" @click="addItem" :disabled="!newItem.trim()">添加条目</el-button>

      <div class="item-cards">
        <el-card v-for="item in filteredItems" :key="item.id" class="item-card">
          <p :class="{hidden:item.isHidden}">{{ item.text }}</p>
          <div class="card-actions">
            <el-button @click="openEditItemDialog(item)">
              <el-icon><EditPen/></el-icon>
            </el-button>
            <el-button @click="toggleItemHidden(item)">
              <el-icon v-if="item.isHidden"><View/></el-icon>
              <el-icon v-else><Hide/></el-icon>
            </el-button>
            <el-button type="danger" @click="deleteItem(item.id)">
              <el-icon><Delete/></el-icon>
            </el-button>
          </div>
        </el-card>
      </div>
    </section>

    <!-- 创建列表弹窗 -->
    <el-dialog v-model="isListDialogVisible" title="创建列表">
      <el-input v-model="newListName" placeholder="列表名称"/>
      <template #footer>
        <el-button @click="isListDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="addList">确定</el-button>
      </template>
    </el-dialog>

    <!-- 编辑条目弹窗 -->
    <el-dialog v-model="isEditItemDialogVisible" title="编辑条目">
      <el-input v-model="editingItem.text" placeholder="条目内容"/>
      <el-select v-model="editingItem.listId" placeholder="选择列表">
        <el-option v-for="list in lists" :key="list.id" :label="list.name" :value="list.id"/>
      </el-select>
      <el-switch v-model="editingItem.isHidden" />
      <template #footer>
        <el-button @click="isEditItemDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="saveEditItem">保存</el-button>
      </template>
    </el-dialog>

    <!-- 编辑列表弹窗 -->
    <el-dialog v-model="isEditListDialogVisible" title="编辑列表">
      <el-input v-model="editingList.name" placeholder="列表名称"/>
      <template #footer>
        <el-button @click="isEditListDialogVisible=false">取消</el-button>
        <el-button type="primary" @click="saveEditList">保存</el-button>
      </template>
    </el-dialog>

    <!-- 随机结果弹窗 -->
    <el-dialog v-model="isResultDialogVisible" title="抽取结果">
      <h2>{{ selectedItem?.text }}</h2>
      <p>来自: {{ lists.find(l=>l.id===selectedItem?.listId)?.name }}</p>
      <p>时间: {{ new Date().toLocaleString() }}</p>
      <template #footer>
        <el-button @click="isResultDialogVisible=false">关闭</el-button>
        <el-button type="primary" @click="randomSelect">再抽一次</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.mobile-crud { padding: 12px; font-family: Arial; }
.mobile-header { display:flex; justify-content: space-between; align-items:center; margin-bottom:12px; }
.mobile-lists .list-cards { display:flex; flex-wrap: wrap; gap: 10px; margin-top:10px; }
.list-card { flex:1 1 calc(50%-10px); padding:10px; cursor:pointer; border-radius:10px; }
.item-cards { display:flex; flex-direction: column; gap: 10px; margin-top:10px; }
.item-card { padding:12px; border-radius:10px; background:white; box-shadow:0 2px 6px rgba(0,0,0,0.1); }
.item-card p.hidden { text-decoration: line-through; color:#999; }
.card-actions { display:flex; gap:5px; margin-top:8px; }
.el-button { font-size:12px; }
@media(max-width:480px){ .list-card{flex:1 1 100%;} }
</style>
