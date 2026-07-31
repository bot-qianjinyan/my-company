from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class ResponseModel(BaseModel, Generic[T]):
    """统一响应格式：{success, code, message, data}"""

    success: bool = True
    code: int = 0
    message: str = "ok"
    data: T | None = None


class PageData(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


def success_response(data: object = None, message: str = "ok") -> dict:
    return {"success": True, "code": 0, "message": message, "data": data}
