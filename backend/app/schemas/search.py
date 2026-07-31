from pydantic import BaseModel


class SearchResultItem(BaseModel):
    type: str
    id: int
    title: str
    subtitle: str | None = None
    link: str
