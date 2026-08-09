'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { TRANSACTION_FILTER_TYPE, type TransactionFilterType } from '@repo/constant';
import { format, parseISO } from 'date-fns';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';

import {
  fetchTransactions,
  transactionKeys,
} from '../lib/transactions';
import {
  TRANSACTION_SORT_FIELD,
  TRANSACTION_SORT_ORDER,
} from '../types/transaction';
import { FormattedAmount } from './formatted-amount';
import { MaskedPayee } from './masked-payee';
import { TransactionTypeBadge } from './transaction-type-badge';

interface AnalyticsTopTransactionsProps {
  startDate?: string;
  endDate?: string;
  payee?: string;
}

export function AnalyticsTopTransactions({
  startDate,
  endDate,
  payee,
}: AnalyticsTopTransactionsProps) {
  const [type, setType] = React.useState<TransactionFilterType>(
    TRANSACTION_FILTER_TYPE.DEBIT,
  );

  const queryParams = {
    page: 1,
    limit: 5,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    payee: payee || undefined,
    type,
    sortBy: TRANSACTION_SORT_FIELD.TRANSACTION_VALUE,
    sortOrder: TRANSACTION_SORT_ORDER.DESC,
  };

  const { data, isLoading, isError, error } = useQuery({
    queryKey: transactionKeys.list(queryParams),
    queryFn: () => fetchTransactions(queryParams),
    staleTime: 60_000,
  });

  const rows = data?.data ?? [];

  return (
    <Card className="shadow-surface-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-2">
        <CardTitle className="text-base">Top 5 Transactions</CardTitle>
        <Select
          value={type}
          onValueChange={(value) => setType(value as TransactionFilterType)}
        >
          <SelectTrigger
            className="h-8 w-[140px]"
            aria-label="Top transaction type"
          >
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TRANSACTION_FILTER_TYPE.DEBIT}>Debit</SelectItem>
            <SelectItem value={TRANSACTION_FILTER_TYPE.CREDIT}>
              Credit
            </SelectItem>
            <SelectItem value={TRANSACTION_FILTER_TYPE.INVESTMENT}>
              Investment
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2 py-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-9 animate-pulse rounded-md bg-muted/40"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            {(error as Error)?.message || 'Failed to load transactions.'}
          </p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No {type.toLowerCase()} transactions in this period.
          </p>
        ) : (
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payee</TableHead>
                  <TableHead>Bank</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="max-w-[160px] truncate font-medium">
                      <MaskedPayee value={row.paymentMadeTo} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.bankName}
                    </TableCell>
                    <TableCell>
                      <TransactionTypeBadge
                        type={row.type}
                        isInvestment={row.isInvestment}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {format(parseISO(row.transactionDate), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      <FormattedAmount value={row.transactionValue} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
