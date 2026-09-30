"""初始化基础数据：角色、管理员账号、示例部门、公司信息、知识库文档

用法：
    source .venv/bin/activate
    python -m app.seed
"""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import CompanyInfo, Department, Role, User, WikiPage, WikiSpace

ROLE_DEFINITIONS = [
    ("admin", "系统管理员", "拥有全部管理权限"),
    ("hr", "人力资源", "管理员工信息、请假审批"),
    ("manager", "部门主管", "审批本部门请假、查看团队信息"),
    ("employee", "普通员工", "基础功能权限"),
]

ATTENDANCE_PAGE_TITLE = "上班打卡时间"

ATTENDANCE_PAGE_CONTENT = """# 上班打卡时间

公司实行固定工时。请在「签到打卡」页面完成每日签到与签退，每人每天各一次。

## 时间规定

| 事项 | 时间 | 说明 |
| --- | --- | --- |
| 上班签到 | 09:30 及之前 | 记为「正常」 |
| 迟到 | 09:30 之后 | 记为「迟到」 |
| 下班签退 | 18:00 及之后 | 当天状态保持「正常」 |
| 早退 | 18:00 之前签退 | 若当天尚未迟到，记为「早退」 |

标准工作时间为 **09:30–18:00**。

## 操作说明

1. 当天第一次进入「签到打卡」，点击「签到」。当天已签到后不能重复签到。
2. 下班后点击「签退」。未签到不能签退，当天已签退后不能重复签退。
3. 「我的记录」可按月查看签到时间、签退时间、工作时长和状态（正常 / 迟到 / 早退）。
4. 主管、HR 和管理员可在「团队记录」中查看团队考勤。

## 注意事项

- 以系统记录的签到、签退时间为准。
- 迟到与早退会在考勤记录中单独标记，请尽量在规定时间内完成打卡。
"""


def seed() -> None:
    db = SessionLocal()
    try:
        role_map: dict[str, Role] = {}
        for code, name, description in ROLE_DEFINITIONS:
            role = db.query(Role).filter(Role.code == code).first()
            if not role:
                role = Role(code=code, name=name, description=description)
                db.add(role)
                db.flush()
            role_map[code] = role

        dept = db.query(Department).filter(Department.name == "总部").first()
        if not dept:
            dept = Department(name="总部", sort_order=0)
            db.add(dept)
            db.flush()

        admin = db.query(User).filter(User.username == "admin").first()
        if not admin:
            admin = User(
                username="admin",
                email="admin@my-company.com",
                hashed_password=hash_password("admin123"),
                display_name="系统管理员",
                position="管理员",
                department_id=dept.id,
                is_superuser=True,
            )
            admin.roles = [role_map["admin"]]
            db.add(admin)
            db.flush()

        company = db.query(CompanyInfo).first()
        if not company:
            company = CompanyInfo(
                name="My Company",
                slogan="连接每一位同事，让协作更简单",
                description="这是公司内部管理平台的示例公司信息，可在“公司信息”模块中编辑。",
                address="示例市示例区示例路 1 号",
                website="https://example.com",
                founded_date="2020-01-01",
            )
            db.add(company)

        space = db.query(WikiSpace).filter(WikiSpace.key == "HR").first()
        if not space:
            space = WikiSpace(
                key="HR",
                name="员工手册",
                description="公司日常制度与操作说明",
                owner_id=admin.id,
            )
            db.add(space)
            db.flush()

        page = (
            db.query(WikiPage)
            .filter(WikiPage.space_id == space.id, WikiPage.title == ATTENDANCE_PAGE_TITLE)
            .first()
        )
        if not page:
            page = WikiPage(
                space_id=space.id,
                title=ATTENDANCE_PAGE_TITLE,
                content=ATTENDANCE_PAGE_CONTENT.strip(),
                sort_order=0,
                creator_id=admin.id,
                updated_by_id=admin.id,
            )
            db.add(page)

        db.commit()
        print("初始化完成：")
        print("  管理员账号: admin / admin123  (请登录后立即修改密码)")
        print("  知识库空间: HR / 员工手册")
        print(f"  知识库文档: {ATTENDANCE_PAGE_TITLE}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
