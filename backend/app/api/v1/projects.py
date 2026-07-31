from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import Issue, Project, User
from app.schemas.common import success_response
from app.schemas.project import IssueCreate, IssueOut, IssueUpdate, ProjectCreate, ProjectOut, ProjectUpdate
from app.services import project_service

router = APIRouter(prefix="/projects", tags=["项目看板"])


def _dump_project(project: Project) -> dict:
    return ProjectOut.model_validate(project).model_dump(mode="json")


def _dump_issue(issue: Issue) -> dict:
    return IssueOut.model_validate(issue).model_dump(mode="json")


@router.get("")
def list_projects(_current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> dict:
    projects = project_service.list_projects(db)
    return success_response(data=[_dump_project(p) for p in projects])


@router.post("")
def create_project(
    payload: ProjectCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    project = project_service.create_project(db, payload, current_user)
    return success_response(data=_dump_project(project), message="项目创建成功")


@router.get("/{project_id}")
def get_project(
    project_id: int, _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    project = project_service.get_project_or_404(db, project_id)
    return success_response(data=_dump_project(project))


@router.put("/{project_id}")
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    project = project_service.update_project(db, project_id, payload, current_user)
    return success_response(data=_dump_project(project), message="项目信息已更新")


@router.delete("/{project_id}")
def delete_project(
    project_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    project_service.delete_project(db, project_id, current_user)
    return success_response(message="项目已删除")


@router.get("/{project_id}/issues")
def list_issues(
    project_id: int, _current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    issues = project_service.list_issues(db, project_id)
    return success_response(data=[_dump_issue(i) for i in issues])


@router.post("/{project_id}/issues")
def create_issue(
    project_id: int,
    payload: IssueCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    issue = project_service.create_issue(db, project_id, payload, current_user)
    return success_response(data=_dump_issue(issue), message="工单创建成功")


@router.put("/issues/{issue_id}")
def update_issue(issue_id: int, payload: IssueUpdate, db: Session = Depends(get_db)) -> dict:
    issue = project_service.update_issue(db, issue_id, payload)
    return success_response(data=_dump_issue(issue), message="工单已更新")


@router.delete("/issues/{issue_id}")
def delete_issue(
    issue_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> dict:
    project_service.delete_issue(db, issue_id, current_user)
    return success_response(message="工单已删除")
