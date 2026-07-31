from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Issue, Project, User, WikiPage

_PER_TYPE_LIMIT = 5


def global_search(db: Session, keyword: str) -> list[dict]:
    keyword = keyword.strip()
    if not keyword:
        return []
    like = f"%{keyword}%"
    results: list[dict] = []

    users = (
        db.query(User)
        .filter(or_(User.display_name.ilike(like), User.username.ilike(like)))
        .limit(_PER_TYPE_LIMIT)
        .all()
    )
    for u in users:
        results.append(
            {
                "type": "user",
                "id": u.id,
                "title": u.display_name,
                "subtitle": u.position or u.username,
                "link": "/departments",
            }
        )

    pages = db.query(WikiPage).filter(WikiPage.title.ilike(like)).limit(_PER_TYPE_LIMIT).all()
    for p in pages:
        results.append({"type": "wiki", "id": p.id, "title": p.title, "subtitle": "知识库文档", "link": "/wiki"})

    projects = (
        db.query(Project)
        .filter(or_(Project.name.ilike(like), Project.key.ilike(like)))
        .limit(_PER_TYPE_LIMIT)
        .all()
    )
    for pr in projects:
        results.append(
            {"type": "project", "id": pr.id, "title": pr.name, "subtitle": f"项目 {pr.key}", "link": "/projects"}
        )

    issues = db.query(Issue).filter(Issue.title.ilike(like)).limit(_PER_TYPE_LIMIT).all()
    for i in issues:
        results.append({"type": "issue", "id": i.id, "title": i.title, "subtitle": "看板工单", "link": "/projects"})

    return results
