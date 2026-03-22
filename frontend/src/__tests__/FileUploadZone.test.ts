import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FileUploadZone from '@/components/candidate-create/FileUploadZone.vue'

function makeFile(name: string, size = 1024, type = 'application/pdf'): File {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size, configurable: true })
  return file
}

async function chooseFiles(wrapper: ReturnType<typeof mount>, files: File[]) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', {
    value: files,
    configurable: true,
  })
  await input.trigger('change')
}

describe('FileUploadZone', () => {
  it('渲染拖拽区域和手动填写按钮', () => {
    const wrapper = mount(FileUploadZone, {
      props: { files: [], uploading: false, error: null },
    })
    expect(wrapper.text()).toContain('拖拽简历文件到这里，或点击选择')
    expect(wrapper.text()).toContain('支持 PDF / DOC / DOCX，单个文件不超过 20MB')
    expect(wrapper.text()).toContain('不上传文件，直接填写')
  })

  it('有文件时显示文件列表', () => {
    const files = [makeFile('张三_简历.pdf', 2048), makeFile('李四_简历.docx', 512)]
    const wrapper = mount(FileUploadZone, {
      props: { files, uploading: false, error: null },
    })
    expect(wrapper.text()).toContain('张三_简历.pdf')
    expect(wrapper.text()).toContain('李四_简历.docx')
    expect(wrapper.findAll('.file-item')).toHaveLength(2)
  })

  it('点击手动填写按钮触发 manual 事件', async () => {
    const wrapper = mount(FileUploadZone, {
      props: { files: [], uploading: false, error: null },
    })
    const manualBtn = wrapper.findAll('button').find((b) => b.text() === '不上传文件，直接填写')
    await manualBtn!.trigger('click')

    expect(wrapper.emitted('manual')).toBeTruthy()
    expect(wrapper.emitted('manual')).toHaveLength(1)
  })

  it('有文件时点击下一步触发 proceed 事件', async () => {
    const files = [makeFile('test.pdf')]
    const wrapper = mount(FileUploadZone, {
      props: { files, uploading: false, error: null },
    })
    const nextBtn = wrapper.findAll('button').find((b) => b.text() === '下一步')
    await nextBtn!.trigger('click')

    expect(wrapper.emitted('proceed')).toBeTruthy()
  })

  it('无文件时不显示下一步按钮', () => {
    const wrapper = mount(FileUploadZone, {
      props: { files: [], uploading: false, error: null },
    })
    const primaryBtn = wrapper.find('.btn-primary')
    expect(primaryBtn.exists()).toBe(false)
  })

  it('移除文件时触发 update:files', async () => {
    const files = [makeFile('a.pdf'), makeFile('b.pdf')]
    const wrapper = mount(FileUploadZone, {
      props: { files, uploading: false, error: null },
    })
    const removeBtn = wrapper.findAll('.file-remove')[0]
    await removeBtn.trigger('click')

    const emitted = wrapper.emitted('update:files')
    expect(emitted).toBeTruthy()
    expect((emitted![0][0] as File[])).toHaveLength(1)
    expect((emitted![0][0] as File[])[0].name).toBe('b.pdf')
  })

  it('上传中显示上传状态', () => {
    const files = [makeFile('test.pdf')]
    const wrapper = mount(FileUploadZone, {
      props: { files, uploading: true, error: null },
    })
    expect(wrapper.text()).toContain('上传中...')
    const btn = wrapper.find('.btn-primary')
    expect((btn.element as HTMLButtonElement).disabled).toBe(true)
  })

  it('显示错误信息', () => {
    const wrapper = mount(FileUploadZone, {
      props: { files: [], uploading: false, error: '文件上传失败' },
    })
    expect(wrapper.find('.upload-error').exists()).toBe(true)
    expect(wrapper.text()).toContain('文件上传失败')
  })

  it('多文件时显示文件数量', () => {
    const files = [makeFile('a.pdf'), makeFile('b.pdf'), makeFile('c.pdf')]
    const wrapper = mount(FileUploadZone, {
      props: { files, uploading: false, error: null },
    })
    expect(wrapper.text()).toContain('处理 3 个文件')
  })

  it('过滤非法类型文件并显示提示，同时保留合法文件', async () => {
    const wrapper = mount(FileUploadZone, {
      props: { files: [], uploading: false, error: null },
    })

    await chooseFiles(wrapper, [
      makeFile('无效.txt', 1024, 'text/plain'),
      makeFile('有效.pdf'),
    ])

    expect(wrapper.text()).toContain('不支持的文件类型：无效.txt')
    const emitted = wrapper.emitted('update:files')
    expect(emitted).toBeTruthy()
    expect((emitted![0][0] as File[]).map((file) => file.name)).toEqual(['有效.pdf'])
  })

  it('过滤超限文件并显示提示，同时保留合法文件', async () => {
    const wrapper = mount(FileUploadZone, {
      props: { files: [], uploading: false, error: null },
    })

    await chooseFiles(wrapper, [
      makeFile('超大.pdf', 20 * 1024 * 1024 + 1),
      makeFile('正常.docx', 2048, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ])

    expect(wrapper.text()).toContain('文件大小超过 20MB 限制：超大.pdf')
    const emitted = wrapper.emitted('update:files')
    expect(emitted).toBeTruthy()
    expect((emitted![0][0] as File[]).map((file) => file.name)).toEqual(['正常.docx'])
  })
})
