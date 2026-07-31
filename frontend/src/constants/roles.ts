export interface RoleOption {
  code: string
  name: string
}

export const ROLE_OPTIONS: RoleOption[] = [
  { code: 'admin', name: '系统管理员' },
  { code: 'hr', name: '人力资源' },
  { code: 'manager', name: '部门主管' },
  { code: 'employee', name: '普通员工' },
]

export function roleName(code: string): string {
  return ROLE_OPTIONS.find((role) => role.code === code)?.name ?? code
}
