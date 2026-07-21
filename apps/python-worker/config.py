from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=_REPO_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    rabbitmq_url: str = Field(alias="RABBITMQ_URL")
    rabbitmq_queue: str = Field(
        default="gmail.messages.process",
        alias="RABBITMQ_QUEUE",
    )
    grpc_host: str = Field(default="localhost:50051", alias="GRPC_HOST")
    email_storage_dir: str = Field(
        default="ingested-emails",
        alias="EMAIL_STORAGE_DIR",
    )
    hf_model_id: str = Field(
        default="microsoft/Phi-4-mini-instruct",
        alias="HF_MODEL_ID",
    )
    hf_device: str = Field(default="auto", alias="HF_DEVICE")
    hf_max_new_tokens: int = Field(default=1024, alias="HF_MAX_NEW_TOKENS")


settings = Settings()
