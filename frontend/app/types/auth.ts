export type Role = 'MASTER' | 'SUPERVISOR' | 'OPERATOR'

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: Role
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface LoginResponse extends AuthTokens {
  user: AuthUser
}
