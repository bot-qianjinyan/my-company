from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr


class DepartmentBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class RoleBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    code: str
    name: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr | None = None
    display_name: str
    phone: str | None = None
    avatar_url: str | None = None
    gender: str | None = None
    position: str | None = None
    employee_no: str | None = None
    hire_date: date | None = None
    is_active: bool
    is_superuser: bool
    department: DepartmentBrief | None = None
    roles: list[RoleBrief] = []


class UserCreate(BaseModel):
    username: str
    password: str
    email: EmailStr | None = None
    display_name: str
    phone: str | None = None
    gender: str | None = None
    position: str | None = None
    employee_no: str | None = None
    hire_date: date | None = None
    department_id: int | None = None
    role_codes: list[str] = []


class UserUpdate(BaseModel):
    """管理员/HR 更新员工信息"""

    email: EmailStr | None = None
    display_name: str | None = None
    phone: str | None = None
    gender: str | None = None
    position: str | None = None
    employee_no: str | None = None
    hire_date: date | None = None
    department_id: int | None = None
    is_active: bool | None = None
    role_codes: list[str] | None = None


class ProfileUpdate(BaseModel):
    """员工自己可编辑的字段。头像通过单独的上传接口写入本地文件。"""

    display_name: str | None = None
    phone: str | None = None
    gender: str | None = None
