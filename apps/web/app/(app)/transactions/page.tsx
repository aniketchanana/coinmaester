import { Card, CardContent } from '@repo/ui/card';

import { TransactionsTable } from '../../../components/transactions-table';

export default function TransactionsPage() {
  return (
    <Card className="shadow-sm pt-2">
      <CardContent className="p-3 pt-0">
        <TransactionsTable />
      </CardContent>
    </Card>
  );
}
