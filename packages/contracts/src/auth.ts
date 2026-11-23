export const AUTH_COOKIE_PREFIX = 'casa';

export const AUTH_ROLES = {
  admin: 'admin',
  user: 'user',
} as const;

export type AuthRole = (typeof AUTH_ROLES)[keyof typeof AUTH_ROLES];

export function hasAdminRole(role: string | null | undefined): boolean {
  return (
    role
      ?.split(',')
      .map((item) => item.trim())
      .includes(AUTH_ROLES.admin) ?? false
  );
}
