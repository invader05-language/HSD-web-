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
})
