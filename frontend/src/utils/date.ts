/**
 * 统一日期格式化工具
 * 所有组件通过此模块格式化日期，禁止在组件内自行拼接日期字符串。
 */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function toDate(iso: string | null | undefined): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

/** YYYY-MM-DD HH:mm */
export function formatDateTime(iso: string | null | undefined): string {
  const d = toDate(iso)
  if (!d) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** YYYY-MM-DD */
export function formatDate(iso: string | null | undefined): string {
  const d = toDate(iso)
  if (!d) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** MM-DD */
export function formatShortDate(iso: string | null | undefined): string {
  const d = toDate(iso)
  if (!d) return ''
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** HH:mm */
export function formatTime(iso: string | null | undefined): string {
  const d = toDate(iso)
  if (!d) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** YYYY-MM-DD 周几 */
export function formatDateWithWeekday(date?: Date): string {
  if (!date || isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${WEEKDAYS[date.getDay()]}`
}
