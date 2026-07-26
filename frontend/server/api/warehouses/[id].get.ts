import { getWarehouseById } from '../../utils/warehousesStore'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  const row = getWarehouseById(id)
  if (!row) {
    setResponseStatus(event, 404)
    return { statusCode: 404, message: 'Gudang tidak ditemukan', error: 'Not Found' }
  }
  return row
})
