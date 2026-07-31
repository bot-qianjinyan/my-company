from sqlalchemy.orm import Session, joinedload

from app.core.exceptions import AppException, ConflictError, ForbiddenError, NotFoundError
from app.models import Issue, Project, User
from app.models.project import ISSUE_STATUSES
from app.schemas.project import IssueCreate, IssueUpdate, ProjectCreate, ProjectUpdate

_PROJECT_RELATIONS = (joinedload(Project.owner), joinedload(Project.members), joinedload(Project.issues))
_ISSUE_RELATIONS = (joinedload(Issue.assignee), joinedload(Issue.reporter))


def _is_admin(user: User) -> bool:
    return user.is_superuser or "admin" in user.role_codes


def _can_manage_project(user: User, project: Project) -> bool:
    return _is_admin(user) or project.owner_id == user.id


def list_projects(db: Session) -> list[Project]:
    return db.query(Project).options(*_PROJECT_RELATIONS).order_by(Project.id).all()


def get_project_or_404(db: Session, project_id: int) -> Project:
    project = db.query(Project).options(*_PROJECT_RELATIONS).filter(Project.id == project_id).first()
    if not project:
        raise NotFoundError("项目不存在")
    return project


def _resolve_members(db: Session, member_ids: list[int]) -> list[User]:
    if not member_ids:
        return []
    return db.query(User).filter(User.id.in_(member_ids)).all()


def create_project(db: Session, payload: ProjectCreate, owner: User) -> Project:
    key = payload.key.strip().upper()
    if not key:
        raise AppException("项目编号不能为空")
    if db.query(Project).filter(Project.key == key).first():
        raise ConflictError("项目编号已存在")

    project = Project(key=key, name=payload.name, description=payload.description, owner_id=owner.id)
    members = _resolve_members(db, payload.member_ids)
    if owner not in members:
        members.append(owner)
    project.members = members
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def update_project(db: Session, project_id: int, payload: ProjectUpdate, current_user: User) -> Project:
    project = get_project_or_404(db, project_id)
    if not _can_manage_project(current_user, project):
        raise ForbiddenError("只有项目负责人或管理员可以修改项目")

    data = payload.model_dump(exclude_unset=True, exclude={"member_ids"})
    for field, value in data.items():
        setattr(project, field, value)
    if payload.member_ids is not None:
        project.members = _resolve_members(db, payload.member_ids)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


def delete_project(db: Session, project_id: int, current_user: User) -> None:
    project = get_project_or_404(db, project_id)
    if not _can_manage_project(current_user, project):
        raise ForbiddenError("只有项目负责人或管理员可以删除项目")
    db.delete(project)
    db.commit()


def list_issues(db: Session, project_id: int) -> list[Issue]:
    get_project_or_404(db, project_id)
    return (
        db.query(Issue)
        .options(*_ISSUE_RELATIONS)
        .filter(Issue.project_id == project_id)
        .order_by(Issue.sort_order, Issue.id)
        .all()
    )


def get_issue_or_404(db: Session, issue_id: int) -> Issue:
    issue = db.query(Issue).options(*_ISSUE_RELATIONS).filter(Issue.id == issue_id).first()
    if not issue:
        raise NotFoundError("工单不存在")
    return issue


def create_issue(db: Session, project_id: int, payload: IssueCreate, reporter: User) -> Issue:
    get_project_or_404(db, project_id)
    max_order = db.query(Issue).filter(Issue.project_id == project_id, Issue.status == "todo").count()
    issue = Issue(
        project_id=project_id,
        title=payload.title,
        description=payload.description,
        issue_type=payload.issue_type,
        priority=payload.priority,
        assignee_id=payload.assignee_id,
        reporter_id=reporter.id,
        due_date=payload.due_date,
        status="todo",
        sort_order=max_order,
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def update_issue(db: Session, issue_id: int, payload: IssueUpdate) -> Issue:
    issue = get_issue_or_404(db, issue_id)
    if payload.status and payload.status not in ISSUE_STATUSES:
        raise AppException("非法的状态值")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(issue, field, value)
    db.add(issue)
    db.commit()
    db.refresh(issue)
    return issue


def delete_issue(db: Session, issue_id: int, current_user: User) -> None:
    issue = get_issue_or_404(db, issue_id)
    project = get_project_or_404(db, issue.project_id)
    if not (_can_manage_project(current_user, project) or issue.reporter_id == current_user.id):
        raise ForbiddenError("只有工单创建者、项目负责人或管理员可以删除工单")
    db.delete(issue)
    db.commit()
