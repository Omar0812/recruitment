<template>
  <el-config-provider :locale="zhCn">
    <AppNav />
    <main class="page-main">
      <router-view />
    </main>
  </el-config-provider>
</template>

<script setup>
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import AppNav from './components/AppNav.vue'
</script>

<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', sans-serif;
  background: #f5f5f5;
  color: #333;
}

.page-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 16px;
}

.el-button {
  border-radius: 6px;
}
</style>
