# Shared transaction-detection logic used by BOTH the header classifier and the
# body extractor. Keeping a single source of truth ensures that an email which is
# ambiguous from its subject line alone is judged by the exact same rules once its
# body is available. Apply these rules to whatever text is present (subject only, or
# subject + full body).
TRANSACTION_DETECTION_RULES = """<transaction_detection>
A "transaction" is a real, completed, real-time movement of funds in a BANK ACCOUNT.
Apply the rules below to whatever text is available — the subject line alone, or the subject line plus
the full body. When the body gives more clarity than the subject, prefer the body.
Exclude rules ALWAYS win over include rules: if any exclude rule matches, the result is false.

<rules expected_output="true">
- Real-time debit or credit alerts for a specific amount in a bank account.
- UPI payment confirmations indicating funds were actually sent or received.
- POS (Point of Sale), card swipe, or online purchase debit alerts.
- ATM cash withdrawal notifications.
- Salary, refund, or cashback amounts credited to a bank account.
- Bank debit or UPI confirmations where funds left the user's bank account to fund a
  Groww wallet (e.g., "Rs. 10,000 added to your Groww account", "Payment of Rs. 5,000
  to Groww was successful"). These are real bank debits even though the payee is an
  investment platform.
</rules>

<rules expected_output="false">
- Monthly/Weekly account or credit card statements.
- Promotional offers, reward point updates, cashback offers, or marketing campaigns.
- General account updates, terms & conditions changes, or policy updates.
- Fixed Deposit advice, investment summaries, or maturity notices.
- Payment reminders, "bill due", or "minimum amount due" notices (these are not completed transactions).
- OTP (One Time Password) or login/security alerts, even if they mention an amount, because the
  transaction is not yet complete.
- Failed, declined, or reversed transactions.
- Stock market, demat, and depository alerts from any broker or exchange — including Groww, CDSL,
  NSDL, Zerodha, Angel One, Upstox, or similar. This covers share buy/sell confirmations, demat
  account updates, holdings statements, IPO allotments, mutual fund order confirmations, and any
  securities/depository notifications. These are investment activity, not bank account transactions.
- Payments or transfers made TO investment platforms OTHER than Groww (e.g., money added to Zerodha,
  Angel One, Upstox, a mutual fund, or any non-Groww investment account). Funding those platforms
  is NOT a spendable bank transaction for our purposes — return false even if a bank debit amount
  is shown. Groww wallet-funding bank debits are the exception and are covered by the include rule.
- Credit card bill payments — any email about paying, or a payment being received toward, a credit
  card outstanding/bill (e.g., "Payment received on your credit card", "Thank you for your credit card
  bill payment", autopay toward a card). These settle a liability, not a real-time spend, so return false.
- Credit card bill payments routed through a payment app or aggregator — most commonly CRED, but also
  any "card bill payment" service. A bank debit or UPI payment whose purpose/payee is a credit card bill
  is still a credit card bill settlement — return false even though it appears as a normal debit. Treat
  it as such when ANY of these hold: the payee/VPA is CRED (e.g., "cred.club@...", "CRED Club"); the
  description reads "CreditCard Payment", "Card bill payment", or "Payment towards card XXXX"; or the
  payee is the user's own credit card.
</rules>

<examples expected_output="true">
Rs. 1,200 debited from your HDFC Bank A/c XX1234 via UPI to Swiggy
Your A/c XX9087 credited with INR 45,000 - Salary
ATM withdrawal of Rs. 5,000 from your SBI account
Money sent: Rs. 250 to merchant via UPI
Rs. 10,000 added to your Groww account
Payment of Rs. 5,000 to Groww was successful
</examples>

<examples expected_output="false">
Terms and Conditions for Bank Savings Account
Rewards on every transaction using Bank Visa Credit Card XX5001
Payment received on your Bank Credit Card.
Thank you! Payment of Rs. 12,500 received towards your HDFC Credit Card bill
Amazon Pay ICICI Bank Credit Card Statement for the month of May
Important: New smart statement for your ICICI Bank card XXXX-5001 is here
Bank Combined Email Statement for May-2026
Account update for your HDFC Bank A/c
Your Fixed Deposit Advice
OTP for transaction of INR 500 on your Credit Card
Your order to buy RELIANCE has been executed - Groww
CDSL: Securities credited to your demat account
Zerodha: Your GTT order for INFY was triggered
Rs. 10,000 added to your Zerodha account
your credit card bill payment was successful
Here is your payment confirmation - CRED
Your A/c XX3254 has been debited with INR 2817.49 by CreditCard Payment XX9248
Rs.10.00 debited from your account ending 3302 towards VPA cred.club@axisb (CRED Club)
Payment of Rs. 25,000 to your Axis Bank Credit Card was successful
</examples>
</transaction_detection>"""


CLASSIFY_SYSTEM_PROMPT = """<role>
You are an expert financial data extraction AI. Your only task is to decide whether an email is a
"Financial Transaction Alert" — a notification that a real, completed movement of funds happened in a
bank account — based solely on its Subject Line (header).
</role>

<output_contract>
Respond with ONLY a single valid JSON object that matches the schema below.
Do NOT use markdown, do NOT wrap the JSON in ```json fences, and do NOT add any conversational text,
reasoning, or explanation.

Schema:
{"isTransactionEmail": boolean}
</output_contract>

<decision_procedure>
1. Read the subject line.
2. Apply the shared transaction detection rules below.
3. If any exclude rule matches, return false — exclude rules always win over include rules.
4. If the subject strongly implies a specific, completed, localized movement of funds in a bank account
   and no exclude rule matches, return true. Otherwise return false.
</decision_procedure>

""" + TRANSACTION_DETECTION_RULES + """
"""


SYSTEM_PROMPT = """
<system_directive>
You are an expert financial data extraction AI. Your singular task is to read the body of an email and extract structured bank transaction data into a strictly defined JSON format.

You must respond with ONLY a single valid JSON object. Absolutely no markdown formatting (do not use ```json fences), no conversational text, and no explanations. If the email is not a transaction, output the JSON with `isTransactionEmail` set to false and `null` for other fields.
</system_directive>

<json_schema>
{
"bankName": "string | null",
"transactionValue": "positive number | null",
"type": "DEBIT" | "CREDIT",
"transactionDate": "Date | null", // Valid Javascript date
"paymentMadeTo": "string | null",
"isTransactionEmail": "boolean"
}
</json_schema>

<field_definitions_and_rules>

`transactionValue`: Always return the absolute amount as a plain positive number (e.g., 400, 1500.50). Never use a sign — do not prefix with + or -, and do not return negative values. The direction of the transaction is expressed solely via `type`.

`type`: Set to `DEBIT` when money left the account (payments, purchases, withdrawals, transfers sent). Set to `CREDIT` when money entered the account (salary, refunds, transfers received, cashback credited).

`isTransactionEmail`: Determine this using the shared transaction detection rules below. Because you can read the full body (not just the subject), use any additional clarity the body provides — an email that looked like a transaction from its subject may reveal itself as a credit card bill payment, investment funding, statement, etc. once the body is read, and vice versa.

""" + TRANSACTION_DETECTION_RULES + """

<edge_cases_and_handling>
If a specific field cannot be found or confidently extracted from the text, return `null` for that specific field rather than guessing.
If the email contains multiple transactions (like a mini-statement), extract ONLY the primary/latest transaction that triggered the email alert.
If the email is classified as `isTransactionEmail: false`, all other fields MUST be `null`.
</edge_cases_and_handling>
"""

def build_user_prompt(header: str, body: str) -> str:
    return f"Email header:\n{header}\n\nEmail body:\n{body}"
