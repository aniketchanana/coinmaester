from pathlib import Path

from config import settings


class EmailBodyReader:
    def __init__(self) -> None:
        self._repo_root = Path(__file__).resolve().parents[3]
        configured = settings.email_storage_dir.strip()
        if Path(configured).is_absolute():
            self._storage_root = Path(configured)
        else:
            self._storage_root = self._repo_root / configured

    def read(self, relative_path: str) -> str:
        normalized = Path(relative_path)
        if normalized.is_absolute() or ".." in normalized.parts:
            raise ValueError(f"Invalid email body path: {relative_path}")

        file_path = self._repo_root / normalized
        if not file_path.is_file():
            raise FileNotFoundError(f"Email body file not found: {file_path}")

        return file_path.read_text(encoding="utf-8")
