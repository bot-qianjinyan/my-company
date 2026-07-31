from pydantic import BaseModel, ConfigDict


class DepartmentBase(BaseModel):
    name: str
    parent_id: int | None = None
    leader_id: int | None = None
    sort_order: int = 0


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    leader_id: int | None = None
    sort_order: int | None = None


class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    leader_name: str | None = None
    member_count: int = 0


class DepartmentTreeNode(DepartmentOut):
    children: list["DepartmentTreeNode"] = []
