from pydantic import BaseModel, ConfigDict, Field


class GmailMessageQueuePayload(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    gmail_message_id: str = Field(alias="gmailMessageId")
