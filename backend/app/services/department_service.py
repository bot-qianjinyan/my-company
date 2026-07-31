from sqlalchemy.orm import Session

from app.core.exceptions import AppException, NotFoundError
from app.models import Department
from app.schemas.department import DepartmentCreate, DepartmentUpdate


def list_departments(db: Session) -> list[Department]:
    return db.query(Department).order_by(Department.sort_order, Department.id).all()


def get_department_or_404(db: Session, department_id: int) -> Department:
    dept = db.get(Department, department_id)
    if not dept:
        raise NotFoundError("部门不存在")
    return dept


def create_department(db: Session, payload: DepartmentCreate) -> Department:
    dept = Department(**payload.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def update_department(db: Session, department_id: int, payload: DepartmentUpdate) -> Department:
    dept = get_department_or_404(db, department_id)
    if payload.parent_id == department_id:
        raise AppException("上级部门不能是自己")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(dept, field, value)
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


def delete_department(db: Session, department_id: int) -> None:
    dept = get_department_or_404(db, department_id)
    if dept.children:
        raise AppException("请先删除或迁移子部门")
    if dept.members:
        raise AppException("该部门下还有员工，请先调整员工部门")
    db.delete(dept)
    db.commit()


def to_department_out_dict(dept: Department) -> dict:
    return {
        "id": dept.id,
        "name": dept.name,
        "parent_id": dept.parent_id,
        "leader_id": dept.leader_id,
        "sort_order": dept.sort_order,
        "leader_name": dept.leader.display_name if dept.leader else None,
        "member_count": len(dept.members),
    }


def build_department_tree(departments: list[Department]) -> list[dict]:
    nodes = {dept.id: {**to_department_out_dict(dept), "children": []} for dept in departments}
    roots: list[dict] = []
    for dept in departments:
        node = nodes[dept.id]
        if dept.parent_id and dept.parent_id in nodes:
            nodes[dept.parent_id]["children"].append(node)
        else:
            roots.append(node)
    return roots
