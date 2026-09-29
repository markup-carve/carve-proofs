export function finding(row) {
  if (row.groups.length === 1) return null
  const p = row.parameters
  if (row.family === 'fences') return 'footnote-fence-base'
  if (p.boundary === 'content-comment' && p.indent === 4) return p.host === 'list-list' ? 'nested-content-comment-opener' : 'opener-after-content-comment'
  if (p.boundary === 'low-comment' && p.indent === 1 && p.follower === 'sibling') return 'marker-below-content'
  if (p.host === 'list-quote' && p.boundary === 'ordinary') return 'quote-lazy-interruption'
  if (p.host === 'list-quote' && p.boundary === 'low-comment') return 'quote-comment-opener'
  if (p.host === 'list-list' && p.indent === 1 && p.follower === 'fence' && p.boundary !== 'content-comment') return 'nested-lazy-code'
  if (p.host === 'list-list' && p.boundary === 'low-comment') return p.indent === 2 ? 'nested-comment-outer-opener' : 'nested-comment-inner-opener'
  if (p.host === 'list-list' && p.boundary === 'content-comment' && p.follower === 'sibling') return 'nested-comment-marker'
  if (p.host === 'list-list' && p.boundary === 'content-comment') return 'nested-comment-retention'
  if (p.host === 'list-list' && p.boundary === 'comment-blank') return 'nested-comment-blank'
  throw new Error(`Unclassified disagreement: ${row.family}/${row.id}`)
}

export const representatives = {
  'footnote-fence-base': 'footnote-quote/3/code',
  'opener-after-content-comment': 'list/content-comment/4/heading',
  'marker-below-content': 'list/low-comment/1/sibling',
  'quote-lazy-interruption': 'list-quote/ordinary/1/heading',
  'quote-comment-opener': 'list-quote/low-comment/4/heading',
  'nested-lazy-code': 'list-list/ordinary/1/fence',
  'nested-comment-outer-opener': 'list-list/low-comment/2/heading',
  'nested-comment-inner-opener': 'list-list/low-comment/4/heading',
  'nested-content-comment-opener': 'list-list/content-comment/4/heading',
  'nested-comment-marker': 'list-list/content-comment/1/sibling',
  'nested-comment-retention': 'list-list/content-comment/1/text',
  'nested-comment-blank': 'list-list/comment-blank/4/text',
}
