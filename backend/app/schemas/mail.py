from pydantic import BaseModel


class MailCreate(BaseModel):
    subject: str
    content: str
    recipient_ids: list[int]
