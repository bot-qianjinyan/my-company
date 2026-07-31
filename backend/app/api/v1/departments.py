from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_hr_or_admin
from app.core.database import get_db
from app.models import User
from app.schemas.common import success_response
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from app.services import department_service

router = APIRouter(prefix="/departments", tags=["组织架构"])


@router.get("")
def list_departments(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    departments = department_service.list_departments(db)
    return success_response(data=[department_service.to_department_out_dict(d) for d in departments])


@router.get("/tree")
def get_department_tree(
    _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    departments = department_service.list_departments(db)
    return success_response(data=department_service.build_department_tree(departments))


@router.post("", dependencies=[Depends(require_hr_or_admin)])
def create_department(payload: DepartmentCreate, db: Session = Depends(get_db)) -> dict:
    dept = department_service.create_department(db, payload)
    return success_response(data=department_service.to_department_out_dict(dept), message="部门创建成功")


@router.put("/{department_id}", dependencies=[Depends(require_hr_or_admin)])
def update_department(department_id: int, payload: DepartmentUpdate, db: Session = Depends(get_db)) -> dict:
    dept = department_service.update_department(db, department_id, payload)
    return success_response(data=department_service.to_department_out_dict(dept), message="部门信息已更新")


@router.delete("/{department_id}", dependencies=[Depends(require_admin)])
def delete_department(department_id: int, db: Session = Depends(get_db)) -> dict:
    department_service.delete_department(db, department_id)
    return success_response(message="部门已删除")
