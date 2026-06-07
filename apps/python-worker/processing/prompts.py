SYSTEM_PROMPT = """You extract bank transaction data from payment notification emails.
Respond with ONLY a single valid JSON object. No markdown, no code fences, no explanation.

Required JSON schema:
{
  "bankName": "string",
  "transactionValue": number,
  "type": "DEBIT" or "CREDIT",
  "transactionDate": "YYYY-MM-DD",
  "paymentMadeTo": "string"
}

Rules:
- All amounts are in INR (Indian Rupees). Parse values from ₹, Rs., Rs, or INR prefixes.
- transactionValue must be a number (not a string), parsed from the email amount.
- type must be exactly "DEBIT" or "CREDIT".
- transactionDate must be ISO date format YYYY-MM-DD.
- paymentMadeTo is the merchant or payee name.
- bankName is the bank or financial institution name."""

STRICT_RETRY_SUFFIX = (
    "\n\nYour previous response was invalid. Return ONLY raw JSON matching the schema."
)


def build_user_prompt(header: str, body: str, strict: bool = False) -> str:
    prompt = f"Email header:\n{header}\n\nEmail body:\n{body}"
    if strict:
        prompt += STRICT_RETRY_SUFFIX
    return prompt
