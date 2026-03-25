import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { showToastUndo } from '../composables/useToastUndo'

describe('useToastUndo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    // 清理残留 toast DOM
    document.querySelectorAll('.toast-undo').forEach(el => el.remove())
  })

  it('5 秒后无撤回 → 调用 onExecute', () => {
    const onExecute = vi.fn()
    showToastUndo('已删除', onExecute)

    // toast 出现在 DOM
    expect(document.querySelector('.toast-undo')).toBeTruthy()
    expect(document.querySelector('.toast-undo')!.textContent).toContain('已删除')

    // 5 秒前不调用
    vi.advanceTimersByTime(4999)
    expect(onExecute).not.toHaveBeenCalled()

    // 5 秒后调用
    vi.advanceTimersByTime(1)
    expect(onExecute).toHaveBeenCalledOnce()

    // toast 已移除
    expect(document.querySelector('.toast-undo')).toBeNull()
  })

  it('点击撤回 → 调用 onUndo，不调用 onExecute', () => {
    const onExecute = vi.fn()
    const onUndo = vi.fn()
    showToastUndo('已删除', onExecute, onUndo)

    const undoBtn = document.querySelector('.toast-undo__btn') as HTMLElement
    expect(undoBtn).toBeTruthy()

    undoBtn.click()

    expect(onUndo).toHaveBeenCalledOnce()
    expect(onExecute).not.toHaveBeenCalled()
    expect(document.querySelector('.toast-undo')).toBeNull()

    // 5 秒后也不再调用 onExecute
    vi.advanceTimersByTime(5000)
    expect(onExecute).not.toHaveBeenCalled()
  })

  it('多 toast 堆叠 → 旧 toast 立即执行 onExecute', () => {
    const onExecuteA = vi.fn()
    const onExecuteB = vi.fn()
    showToastUndo('删除 A', onExecuteA)
    showToastUndo('删除 B', onExecuteB)

    // A 立即执行
    expect(onExecuteA).toHaveBeenCalledOnce()

    // 只剩一个 toast
    const toasts = document.querySelectorAll('.toast-undo')
    expect(toasts.length).toBe(1)
    expect(toasts[0].textContent).toContain('删除 B')

    // B 等 5 秒后执行
    vi.advanceTimersByTime(5000)
    expect(onExecuteB).toHaveBeenCalledOnce()
  })

  it('无 onUndo 时点击撤回 → 不报错，不执行 onExecute', () => {
    const onExecute = vi.fn()
    showToastUndo('已删除', onExecute)

    const undoBtn = document.querySelector('.toast-undo__btn') as HTMLElement
    undoBtn.click()

    expect(onExecute).not.toHaveBeenCalled()
    expect(document.querySelector('.toast-undo')).toBeNull()
  })

  it('点击确认按钮 → 立即执行 onExecute 并移除 toast', () => {
    const onExecute = vi.fn()
    const onUndo = vi.fn()
    showToastUndo('已删除', onExecute, onUndo)

    const confirmBtn = document.querySelector('.toast-undo__confirm') as HTMLElement
    expect(confirmBtn).toBeTruthy()

    confirmBtn.click()

    expect(onExecute).toHaveBeenCalledOnce()
    expect(onUndo).not.toHaveBeenCalled()
    expect(document.querySelector('.toast-undo')).toBeNull()

    // 5 秒后不再重复调用
    vi.advanceTimersByTime(5000)
    expect(onExecute).toHaveBeenCalledOnce()
  })

  it('确认按钮默认文案为「确认」', () => {
    showToastUndo('已删除', vi.fn())

    const confirmBtn = document.querySelector('.toast-undo__confirm') as HTMLElement
    expect(confirmBtn.textContent).toBe('确认')
  })

  it('确认按钮支持自定义文案', () => {
    showToastUndo('已删除', vi.fn(), undefined, '确认删除')

    const confirmBtn = document.querySelector('.toast-undo__confirm') as HTMLElement
    expect(confirmBtn.textContent).toBe('确认删除')
  })
})
