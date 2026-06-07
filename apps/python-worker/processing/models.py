from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class ExtractedTransaction(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    bank_name: str = Field(alias="bankName")
    transaction_value: float = Field(alias="transactionValue")
    type: Literal["DEBIT", "CREDIT"]
    transaction_date: str = Field(alias="transactionDate")
    payment_made_to: str = Field(alias="paymentMadeTo")
