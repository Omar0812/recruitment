import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FileGrouping from '@/components/candidate-create/FileGrouping.vue'
import type { FileGroup } from '@/composables/useCandidateCreate'

function makeFile(name: string): File {
  return new File(['x'], name, { type: 'application/pdf' })
}

function makeGroups(): FileGroup[] {
  return [
    {
      label: '张三_简历',
      files: [makeFile('张三_简历.pdf'), makeFile('张三_作品集.pdf')],
    },
    {
      label: '李四',
      files: [makeFile('李四.pdf')],
    },
  ]
}

describe('FileGrouping', () => {
  it('可将文件移动到其他候选人分组后再确认', async () => {
    const wrapper = mount(FileGrouping, {
      props: {
        groups: makeGroups(),
        uploading: false,
        error: null,
      },
    })

    const selects = wrapper.findAll('.group-file__select')
    await selects[1].setValue('1')
    await wrapper.find('.btn-primary').trigger('click')

    const emitted = wrapper.emitted('confirm')
    expect(emitted).toBeTruthy()
    const groups = emitted![0][0] as FileGroup[]
    expect(groups).toHaveLength(2)
    expect(groups[0].files.map((file) => file.name)).toEqual(['张三_简历.pdf'])
    expect(groups[1].files.map((file) => file.name)).toEqual(['李四.pdf', '张三_作品集.pdf'])
  })

  it('可把文件单独成组后再确认', async () => {
    const wrapper = mount(FileGrouping, {
      props: {
        groups: makeGroups(),
        uploading: false,
        error: null,
      },
    })

    const splitButtons = wrapper.findAll('.group-file__split')
    await splitButtons[1].trigger('click')
    await wrapper.find('.btn-primary').trigger('click')

    const emitted = wrapper.emitted('confirm')
    expect(emitted).toBeTruthy()
    const groups = emitted![0][0] as FileGroup[]
    expect(groups).toHaveLength(3)
    expect(groups.map((group) => group.files.map((file) => file.name))).toEqual([
      ['张三_简历.pdf'],
      ['李四.pdf'],
      ['张三_作品集.pdf'],
    ])
  })
})
