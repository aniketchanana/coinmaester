export interface EmailBody {
  gmailMessageId: string;
  from: string;
  subject: string;
  receivedAt: string;
  /** Raw stored body. Untrusted third-party markup — never inject it directly. */
  body: string;
  isHtml: boolean;
}
