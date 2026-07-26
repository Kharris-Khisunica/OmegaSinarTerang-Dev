import { findByCode, insertWarehouse } from '../../utils/warehousesStore'

const VALID_TYPES = ['STORE', 'CUSTOMER_CONSIGNMENT', 'BAD_STOCK']

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const messages: string[] = []

  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
    messages.push('name should not be empty')
  }
  if (!body?.code || typeof body.code !== 'string' || !body.code.trim()) {
    messages.push('code should not be empty')
  } else if (findByCode(body.code)) {
    messages.push('code sudah dipakai gudang lain')
  }
  if (!body?.type || !VALID_TYPES.includes(body.type)) {
    messages.push('type must be one of STORE, CUSTOMER_CONSIGNMENT, BAD_STOCK')
  }

  if (messages.length) {
    setResponseStatus(event, 400)
    return { statusCode: 400, message: messages, error: 'Bad Request' }
  }

  const row = insertWarehouse({
    code: body.code.trim(),
    name: body.name.trim(),
    type: body.type,
    address: body.address ?? '',
    is_active: body.is_active ?? true
  })

  setResponseStatus(event, 201)
  return row
})
