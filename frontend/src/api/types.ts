export interface DepartmentBrief {
  id: number
  name: string
}

export interface RoleBrief {
  code: string
  name: string
}

export interface UserOut {
  id: number
  username: string
  email?: string | null
  display_name: string
  phone?: string | null
  avatar_url?: string | null
  gender?: string | null
  position?: string | null
  employee_no?: string | null
  hire_date?: string | null
  is_active: boolean
  is_superuser: boolean
  department?: DepartmentBrief | null
  roles: RoleBrief[]
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  user: UserOut
}

export interface DepartmentOut {
  id: number
  name: string
  parent_id: number | null
  leader_id: number | null
  sort_order: number
  leader_name?: string | null
  member_count: number
}

export interface DepartmentTreeNode extends DepartmentOut {
  children: DepartmentTreeNode[]
}

export interface CompanyInfoOut {
  id: number
  name: string
  slogan?: string | null
  description?: string | null
  logo_url?: string | null
  address?: string | null
  website?: string | null
  founded_date?: string | null
}

export interface AnnouncementOut {
  id: number
  title: string
  content: string
  pinned: boolean
  created_at: string
  created_by_name?: string | null
}
