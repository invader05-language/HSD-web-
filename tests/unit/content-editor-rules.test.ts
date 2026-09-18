import { describe, expect, it } from 'vitest'
import { initialContentEditorBlocks, missingContentPublicationFields } from '../../app/utils/content-editor-rules'

describe('content editor publication rules', () => {
  it('starts every new content kind with one editable paragraph', () => {
    expect(initialContentEditorBlocks(false)).toEqual([{ type: 'paragraph', text: '' }])
  })

  it('does not require body for drafts but reports it for publication', () => {
    expect(missingContentPublicationFields('article', {
      title: '标题', centerId: 'center', summary: '摘要', tag: '', internalTarget: '', blocks: [],
    })).toEqual(['正文'])
  })

  it('allows an existing system-wide record to publish without a center', () => {
    expect(missingContentPublicationFields('flash', {
      title: '系统快讯', centerId: '', summary: '', tag: '通知', internalTarget: '/activities',
      blocks: [{ type: 'paragraph', text: '正文' }],
    }, { requireCenter: false })).toEqual([])
  })

  it('still requires a center for a manually created record', () => {
    expect(missingContentPublicationFields('article', {
      title: '人工内容', centerId: '', summary: '摘要', tag: '', internalTarget: '',
      blocks: [{ type: 'paragraph', text: '正文' }],
    }, { requireCenter: true })).toEqual(['归属中心'])
  })
})
