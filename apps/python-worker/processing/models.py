from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ExtractedTransaction(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    bank_name: str = Field(alias="bankName")
    transaction_value: float = Field(alias="transactionValue")
    type: Literal["DEBIT", "CREDIT"]
    transaction_date: str = Field(alias="transactionDate")
    payment_made_to: str = Field(alias="paymentMadeTo")
    is_transaction_email: bool = Field(alias="isTransactionEmail")


def empty_transaction() -> ExtractedTransaction:
    return ExtractedTransaction(
        bank_name="",
        transaction_value=0,
        type="DEBIT",
        transaction_date="",
        payment_made_to="",
        is_transaction_email=False,
    )


class LlmClassificationResponse(BaseModel):
    """Validates the raw JSON returned by the classification LLM.

    `extra="forbid"` rejects any field that is not part of the prompt schema.
    """

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    is_transaction_email: bool = Field(alias="isTransactionEmail")
    reason: str = Field(default=None, alias="reason")


class LlmTransactionResponse(BaseModel):
    """Validates the raw JSON returned by the extraction LLM.

    `extra="forbid"` rejects any field that is not part of the prompt schema.
    """

    model_config = ConfigDict(populate_by_name=True, extra="forbid")

    bank_name: Optional[str] = Field(default=None, alias="bankName")
    transaction_value: Optional[float] = Field(default=None, alias="transactionValue")
    type: Optional[Literal["DEBIT", "CREDIT"]] = None
    transaction_date: Optional[str] = Field(default=None, alias="transactionDate")
    payment_made_to: Optional[str] = Field(default=None, alias="paymentMadeTo")
    is_transaction_email: bool = Field(alias="isTransactionEmail")
