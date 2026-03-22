/**
 * 错误 toast — DOM 直出，3 秒自动消失
 * 复用 .toast-undo 全局样式（EndFlowPanel.vue 定义）
 */
export function showErrorToast(message: string) {
  const toast = document.createElement('div')
  toast.className = 'toast-undo'
  const span = document.createElement('span')
  span.textContent = message
  toast.appendChild(span)
  document.body.appendChild(toast)

  setTimeout(() => {
    toast.remove()
  }, 3000)
}
