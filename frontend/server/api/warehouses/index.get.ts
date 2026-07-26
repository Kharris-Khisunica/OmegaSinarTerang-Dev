import { listWarehouses } from '../../utils/warehousesStore'

export default defineEventHandler((event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const limit = Math.max(1, Number(query.limit) || 20)
  const search = typeof query.search === 'string' ? query.search.toLowerCase() : ''
  const type = typeof query.type === 'string' ? query.type : ''
  const sortBy = typeof query.sortBy === 'string' ? query.sortBy : 'id'
  const sortDir = query.sortDir === 'desc' ? -1 : 1

  let rows = listWarehouses().slice()

  if (search) {
    rows = rows.filter(w =>
      w.name.toLowerCase().includes(search)
      || w.code.toLowerCase().includes(search)
      || w.address.toLowerCase().includes(search)
    )
  }
  if (type) {
    rows = rows.filter(w => w.type === type)
  }

  rows.sort((a, b) => {
    const av = a[sortBy as keyof typeof a]
    const bv = b[sortBy as keyof typeof b]
    if (av === bv) return 0
    return av > bv ? sortDir : -sortDir
  })

  const total = rows.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const start = (page - 1) * limit
  const data = rows.slice(start, start + limit)

  return {
    data,
    meta: { page, limit, total, totalPages }
  }
})
