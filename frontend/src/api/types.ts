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

export interface PersonBrief {
  id: number
  display_name: string
}

export interface LeaveRequestOut {
  id: number
  leave_type: string
  start_date: string
  end_date: string
  days: number
  reason?: string | null
  status: string
  approve_comment?: string | null
  approved_at?: string | null
  created_at: string
  user: PersonBrief
  approver?: PersonBrief | null
}

export interface AttendanceRecordOut {
  id: number
  work_date: string
  clock_in_at?: string | null
  clock_out_at?: string | null
  status: string
  note?: string | null
}

export interface AttendanceRecordWithUserOut extends AttendanceRecordOut {
  user: PersonBrief
}

export interface ProjectOut {
  id: number
  key: string
  name: string
  description?: string | null
  owner?: PersonBrief | null
  member_count: number
  issue_count: number
}

export interface IssueOut {
  id: number
  project_id: number
  title: string
  description?: string | null
  issue_type: string
  priority: string
  status: string
  due_date?: string | null
  sort_order: number
  created_at: string
  assignee?: PersonBrief | null
  reporter?: PersonBrief | null
}

export interface WikiSpaceOut {
  id: number
  key: string
  name: string
  description?: string | null
  owner?: PersonBrief | null
  page_count: number
}

export interface WikiPageOut {
  id: number
  space_id: number
  parent_id?: number | null
  title: string
  content: string
  sort_order: number
  creator?: PersonBrief | null
  updated_by?: PersonBrief | null
  updated_at: string
}

export interface InboxMailOut {
  id: number
  subject: string
  content: string
  created_at: string
  sender: PersonBrief
  is_read: boolean
  read_at?: string | null
}

export interface SentMailOut {
  id: number
  subject: string
  content: string
  created_at: string
  sender: PersonBrief
  recipients: PersonBrief[]
}

export interface ExpenseInvoiceOut {
  id: number
  file_name: string
  file_url: string
  invoice_no?: string | null
  amount?: number | null
  created_at: string
}

export interface ExpenseClaimOut {
  id: number
  title: string
  category: string
  amount: number
  expense_date: string
  description?: string | null
  status: string
  approve_comment?: string | null
  approved_at?: string | null
  paid_at?: string | null
  created_at: string
  user: PersonBrief
  approver?: PersonBrief | null
  invoices: ExpenseInvoiceOut[]
}
