export type TransactionRow = {
  id: string;
  paymentType: string;
  amount: string | null;
  time: string;
  vendor: string;
  description?: string;
};
