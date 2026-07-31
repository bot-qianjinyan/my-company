import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.exceptions import AppException

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent / "uploads"
INVOICE_SUBDIR = "invoices"
ALLOWED_INVOICE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".pdf"}
MAX_INVOICE_SIZE_BYTES = 10 * 1024 * 1024


async def save_invoice_file(file: UploadFile) -> tuple[str, str]:
    """保存发票附件到本地磁盘，返回 (存储相对路径, 原始文件名)"""

    original_name = file.filename or "invoice"
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_INVOICE_EXTENSIONS:
        raise AppException("仅支持上传图片（jpg/png/webp）或 PDF 格式的发票文件")

    content = await file.read()
    if len(content) > MAX_INVOICE_SIZE_BYTES:
        raise AppException("发票文件大小不能超过 10MB")
    if not content:
        raise AppException("上传的文件内容为空")

    target_dir = UPLOAD_ROOT / INVOICE_SUBDIR
    target_dir.mkdir(parents=True, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}{ext}"
    target_path = target_dir / stored_name
    target_path.write_bytes(content)

    relative_path = f"{INVOICE_SUBDIR}/{stored_name}"
    return relative_path, original_name


def delete_invoice_file(relative_path: str) -> None:
    target_path = UPLOAD_ROOT / relative_path
    if target_path.exists():
        target_path.unlink()


def invoice_file_url(relative_path: str) -> str:
    return f"/uploads/{relative_path}"
