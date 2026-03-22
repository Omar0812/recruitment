/**
 * Toast 撤回 composable — DOM 直出，脱离组件生命周期
 * 复用 EndFlowPanel 的 .toast-undo 全局样式
 */

let currentToast: { el: HTMLElement; timer: ReturnType<typeof setTimeout>; onExecute: () => void | Promise<void> } | null = null

/**
 * 显示 toast 撤回通知
 * @param message 显示文本
 * @param onExecute 5 秒后无撤回时执行
 * @param onUndo 用户点击撤回时执行（可选）
 */
export function showToastUndo(
  message: string,
  onExecute: () => void | Promise<void>,
  onUndo?: () => void
) {
  // 如果已有 toast，立即执行旧 toast 的 onExecute 并移除
  if (currentToast) {
    clearTimeout(currentToast.timer)
    currentToast.el.remove()
    const oldExecute = currentToast.onExecute
    currentToast = null
    oldExecute()
  }

  const toast = document.createElement('div')
  toast.className = 'toast-undo'
  toast.innerHTML = `
    <span>${message}</span>
    <button class="toast-undo__btn">撤回</button>
    <div class="toast-undo__progress"></div>
  `
  document.body.appendChild(toast)

  const undoBtn = toast.querySelector('.toast-undo__btn')!
  const progress = toast.querySelector('.toast-undo__progress') as HTMLElement

  // 5 秒倒计时动画
  progress.style.animation = 'toast-countdown 5s linear forwards'

  let settled = false

  undoBtn.addEventListener('click', () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    toast.remove()
    currentToast = null
    onUndo?.()
  })

  const timer = setTimeout(() => {
    if (settled) return
    settled = true
    toast.remove()
    currentToast = null
    onExecute()
  }, 5000)

  currentToast = { el: toast, timer, onExecute }
}
