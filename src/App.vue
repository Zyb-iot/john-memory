<script setup>
// 注意：如果要使用新界面，请将下面的CrudApp替换为L-app
// import CrudApp from './components/CrudApp.vue'
// 如果要切换回旧界面，只需注释掉下面的L-app并取消注释上面的CrudApp
import LApp from './components/L-app.vue'
</script>

<template>
  <!-- <CrudApp /> -->
  <LApp />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}
</style>
