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

    rabbitmq_url: str = Field(
        default="amqp://finance:finance@localhost:5672",
        alias="RABBITMQ_URL",
    )
    rabbitmq_queue: str = Field(
        default="gmail.messages.process",
        alias="RABBITMQ_QUEUE",
    )
    grpc_host: str = Field(default="localhost:50051", alias="GRPC_HOST")
    email_storage_dir: str = Field(
        default="ingested-emails",
        alias="EMAIL_STORAGE_DIR",
    )
    anthropic_api_key: str = Field(default="lmstudio", alias="ANTHROPIC_API_KEY")
    anthropic_base_url: str = Field(
        default="http://localhost:1234",
        alias="ANTHROPIC_BASE_URL",
    )
    anthropic_model: str = Field(
        default="qwen/qwen2.5-CODER-14b",
        alias="ANTHROPIC_MODEL",
    )


settings = Settings()
