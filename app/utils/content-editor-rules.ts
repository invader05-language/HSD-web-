export type ContentEditorBlock =
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; attachmentId: string; alt: string; caption?: string }

type ContentBlockLike =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'image'; alt?: string; caption?: string; attachmentId?: string; assetId?: string; media?: unknown }

export function initialContentEditorBlocks(hasRecord: boolean): ContentEditorBlock[] {
  return hasRecord ? [] : [{ type: 'paragraph', text: '' }]
}

export function missingContentPublicationFields(kind: 'flash' | 'article' | 'notice', input: {
  title: string
  centerId?: string
  summary?: string
  tag?: string
  internalTarget?: string
  blocks: readonly ContentBlockLike[]
}): string[] {
  const missing: string[] = []
  if (!input.title.trim()) missing.push('标题')
  if (input.centerId !== undefined && !input.centerId.trim()) missing.push('归属中心')
  if (kind === 'flash') {
    if (!input.tag?.trim()) missing.push('标签')
    if (!input.internalTarget?.trim()) missing.push('关联页面')
  } else if (!input.summary?.trim()) {
    missing.push('摘要')
  }
  if (!input.blocks.some((block) => (block.type === 'heading' || block.type === 'paragraph') && block.text.trim())) {
    missing.push('正文')
  }
  return missing
}
