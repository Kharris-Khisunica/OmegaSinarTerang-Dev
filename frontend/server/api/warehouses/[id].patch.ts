import { findByCode, getWarehouseById, updateWarehouse } from '../../utils/warehousesStore'

const VALID_TYPES = ['STORE', 'CUSTOMER_CONSIGNMENT', 'BAD_STOCK']

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  const existing = getWarehouseById(id)
  if (!existing) {
    setResponseStatus(event, 404)
    return { statusCode: 404, message: 'Gudang tidak ditemukan', error: 'Not Found' }
  }

  const body = await readBody(event)
  const messages: string[] = []

  if (body.name !== undefined && !String(body.name).trim()) {
    messages.push('name should not be empty')
  }
  if (body.code !== undefined) {
    if (!String(body.code).trim()) messages.push('code should not be empty')
    else if (findByCode(body.code, id)) messages.push('code sudah dipakai gudang lain')
  }
  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    messages.push('type must be one of STORE, CUSTOMER_CONSIGNMENT, BAD_STOCK')
  }

  if (messages.length) {
    setResponseStatus(event, 400)
    return { statusCode: 400, message: messages, error: 'Bad Request' }
  }

  const row = updateWarehouse(id, {
    ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
    ...(body.code !== undefined ? { code: String(body.code).trim() } : {}),
    ...(body.type !== undefined ? { type: body.type } : {}),
    ...(body.address !== undefined ? { address: body.address } : {}),
    ...(body.is_active !== undefined ? { is_active: body.is_active } : {})
  })

  return row
})
