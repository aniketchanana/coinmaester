import { SyncStatus } from '../../../components/sync-status';
import { TransactionsTable } from '../../../components/transactions-table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/card';
import type { TransactionRow } from '../../../types/transaction';

const transactions: TransactionRow[] = [];

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your spending and synced email activity.
        </p>
      </div>

      <SyncStatus />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
          <CardDescription>
            Recent activity from your connected accounts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TransactionsTable rows={transactions} />
        </CardContent>
      </Card>
    </div>
  );
}
