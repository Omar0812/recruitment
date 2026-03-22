import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import CompanyView from '@/views/CompanyView.vue'
import { useCompany } from '@/composables/useCompany'

vi.mock('@/composables/useCompany')

describe('CompanyView', () => {
  const mockDepartments = [
    { id: 1, type: 'department', name: '技术部', sort_order: 0, address: null },
    { id: 2, type: 'department', name: '产品部', sort_order: 1, address: null },
  ]

  const mockLocations = [
    { id: 3, type: 'location', name: '北京', sort_order: 0, address: '朝阳区CBD' },
  ]

  beforeEach(() => {
    vi.mocked(useCompany).mockReturnValue({
      state: {
        departments: mockDepartments,
        locations: mockLocations,
        loading: false,
        error: null,
      },
      loadAll: vi.fn(),
      addDepartment: vi.fn(),
      addLocation: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      reorder: vi.fn(),
    } as any)
  })

  it('渲染公司页标题', () => {
    const wrapper = mount(CompanyView)
    expect(wrapper.find('h1').text()).toBe('公司')
  })

  it('渲染部门和办公地点两个 Section', () => {
    const wrapper = mount(CompanyView)
    const sections = wrapper.findAllComponents({ name: 'TermSection' })
    expect(sections.length).toBe(2)
  })

  it('加载时显示加载状态', () => {
    vi.mocked(useCompany).mockReturnValue({
      state: {
        departments: [],
        locations: [],
        loading: true,
        error: null,
      },
      loadAll: vi.fn(),
      addDepartment: vi.fn(),
      addLocation: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      reorder: vi.fn(),
    } as any)

    const wrapper = mount(CompanyView)
    expect(wrapper.find('.loading').text()).toBe('加载中...')
  })

  it('挂载时调用 loadAll', () => {
    const loadAll = vi.fn()
    vi.mocked(useCompany).mockReturnValue({
      state: { departments: [], locations: [], loading: false, error: null },
      loadAll,
      addDepartment: vi.fn(),
      addLocation: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      reorder: vi.fn(),
    } as any)

    mount(CompanyView)
    expect(loadAll).toHaveBeenCalled()
  })

  it('空列表时展示精确空状态文案', () => {
    vi.mocked(useCompany).mockReturnValue({
      state: {
        departments: [],
        locations: [],
        loading: false,
        error: null,
      },
      loadAll: vi.fn(),
      addDepartment: vi.fn(),
      addLocation: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
      reorder: vi.fn(),
    } as any)

    const wrapper = mount(CompanyView)
    expect(wrapper.text()).toContain('还没有部门，点击右上角新增')
    expect(wrapper.text()).toContain('还没有办公地点，点击右上角新增')
  })
})
