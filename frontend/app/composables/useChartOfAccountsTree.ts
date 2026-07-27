export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'

export interface AccountRow extends Record<string, unknown> {
  id: string
  code: string
  name: string
  accountType: AccountType
  parentId: string | null
  isActive: boolean
}

export interface AccountNode extends AccountRow {
  children: AccountNode[]
}

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  ASSET: 'Aset',
  LIABILITY: 'Kewajiban',
  EQUITY: 'Modal',
  INCOME: 'Pendapatan',
  EXPENSE: 'Beban'
}

/** Susun daftar flat akun (dengan `parentId`) jadi tree, urut `code` tiap level. */
export function buildAccountTree(accounts: AccountRow[]): AccountNode[] {
  const byId = new Map<string, AccountNode>()
  for (const account of accounts) byId.set(account.id, { ...account, children: [] })

  const roots: AccountNode[] = []
  for (const node of byId.values()) {
    const parent = node.parentId ? byId.get(node.parentId) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  const sortRec = (list: AccountNode[]) => {
    list.sort((a, b) => a.code.localeCompare(b.code))
    list.forEach(node => sortRec(node.children))
  }
  sortRec(roots)
  return roots
}
