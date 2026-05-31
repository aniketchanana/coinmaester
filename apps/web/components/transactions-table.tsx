'use client';

import * as React from 'react';

import { Button } from '@repo/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';
import type { TransactionRow } from '../types/transaction';

const PAGE_SIZE = 10;

type TransactionsTableProps = {
  rows: TransactionRow[];
};

export function TransactionsTable({ rows }: TransactionsTableProps) {
  const [page, setPage] = React.useState(0);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const pageItems = rows.slice(
    currentPage * PAGE_SIZE,
    currentPage * PAGE_SIZE + PAGE_SIZE,
  );

  React.useEffect(() => {
    setPage(0);
  }, [rows.length]);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[140px]">Payment type</TableHead>
            <TableHead className="w-[120px]">Amount</TableHead>
            <TableHead className="w-[180px]">Time</TableHead>
            <TableHead>Vendor / description</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageItems.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="h-32 text-center">
                <p className="text-sm font-medium text-foreground">
                  No transactions yet
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  They will show up here once your email sync is connected.
                </p>
              </TableCell>
            </TableRow>
          ) : (
            pageItems.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.paymentType}</TableCell>
                <TableCell>{row.amount ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {row.time}
                </TableCell>
                <TableCell>
                  <div className="font-medium">{row.vendor}</div>
                  {row.description ? (
                    <div className="text-sm text-muted-foreground">
                      {row.description}
                    </div>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {rows.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Page {currentPage + 1} of {totalPages} ({rows.length} items)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
