export function readQuery(params: URLSearchParams) {
  const rawPage = Number(params.get('page') || 1)
  const size = Number(params.get('page_size') || 10)
  const rawStatus = params.get('status') || ''
  return {
    search: (params.get('search') || '').slice(0, 100),
    status: ['active', 'inactive', 'pending'].includes(rawStatus)
      ? rawStatus
      : '',
    page:
      Number.isInteger(rawPage) && rawPage > 0 && rawPage <= 1_000_000
        ? rawPage
        : 1,
    page_size: [10, 25, 50].includes(size) ? size : 10,
  }
}
