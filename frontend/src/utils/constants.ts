export const SCORE_OPTIONS = [
  { value: 1, label: '淘汰', color: 'var(--color-urgent, #e53e3e)' },
  { value: 2, label: '通过，一般', color: '#dd6b20' },
  { value: 3, label: '通过，良好', color: 'var(--color-primary, #3b82f6)' },
  { value: 4, label: '通过，优秀', color: '#16a34a' },
] as const

export const TIME_HALF_HOUR_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, '0')
  const m = i % 2 === 0 ? '00' : '30'
  return `${h}:${m}`
})
