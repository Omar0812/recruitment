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
 * @param confirmLabel 确认按钮文案（默认 '确认'）
 */
export function showToastUndo(
  message: string,
  onExecute: () => void | Promise<void>,
  onUndo?: () => void,
  confirmLabel: string = '确认'
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

  const messageSpan = document.createElement('span')
  messageSpan.textContent = message

  const confirmBtnEl = document.createElement('button')
  confirmBtnEl.className = 'toast-undo__confirm'
  confirmBtnEl.textContent = confirmLabel

  const undoBtnEl = document.createElement('button')
  undoBtnEl.className = 'toast-undo__btn'
  undoBtnEl.textContent = '撤回'

  const progressEl = document.createElement('div')
  progressEl.className = 'toast-undo__progress'

  toast.appendChild(messageSpan)
  toast.appendChild(confirmBtnEl)
  toast.appendChild(undoBtnEl)
  toast.appendChild(progressEl)
  document.body.appendChild(toast)

  // 5 秒倒计时动画
  progressEl.style.animation = 'toast-countdown 5s linear forwards'

  let settled = false

  confirmBtnEl.addEventListener('click', () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    toast.remove()
    currentToast = null
    onExecute()
  })

  undoBtnEl.addEventListener('click', () => {
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
