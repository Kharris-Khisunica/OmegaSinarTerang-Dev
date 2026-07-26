import { Role } from '../../../common/enums/role.enum';

export interface JwtPayload {
  sub: string;
  username: string;
  role: Role;
  type: 'access' | 'refresh';
}

export interface AuthenticatedUser {
  sub: string;
  username: string;
  role: Role;
}
