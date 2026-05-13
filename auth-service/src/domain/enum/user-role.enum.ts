export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export function parseUserRole(value: string): UserRole {
  if (value === UserRole.USER || value === UserRole.ADMIN) {
    return value;
  }
  throw new Error(`Invalid user role: ${value}`);
}
