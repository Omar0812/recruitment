import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import TermSection from '@/components/company/TermSection.vue'

describe('TermSection', () => {
  it('异步新增失败时在当前 section 展示错误提示', async () => {
    const onAdd = vi.fn().mockRejectedValue(new Error('已存在'))

    const wrapper = mount(TermSection, {
      props: {
        title: '部门',
        items: [],
        onAdd,
        onUpdate: vi.fn(),
        onDelete: vi.fn(),
        onReorder: vi.fn(),
      },
    })

    await wrapper.get('.btn-text').trigger('click')
    await wrapper.get('input').setValue('技术部')
    await wrapper.get('.btn-primary').trigger('click')
    await flushPromises()

    expect(onAdd).toHaveBeenCalledWith('技术部', undefined)
    expect(wrapper.text()).toContain('已存在')
  })
})
