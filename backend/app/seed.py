"""初始化基础数据：角色、管理员账号、示例部门、公司信息

用法：
    source .venv/bin/activate
    python -m app.seed
"""

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models import CompanyInfo, Department, Role, User

ROLE_DEFINITIONS = [
    ("admin", "系统管理员", "拥有全部管理权限"),
    ("hr", "人力资源", "管理员工信息、请假审批"),
    ("manager", "部门主管", "审批本部门请假、查看团队信息"),
    ("employee", "普通员工", "基础功能权限"),
]


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

        db.commit()
        print("初始化完成：")
        print("  管理员账号: admin / admin123  (请登录后立即修改密码)")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
