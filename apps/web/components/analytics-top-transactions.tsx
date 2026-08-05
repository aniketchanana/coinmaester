'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TRANSACTION_FILTER_TYPE,
  type TransactionFilterType,
} from '@repo/constant';
import { format } from 'date-fns';

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

import { fetchTransactions, transactionKeys } from '../lib/transactions';
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
    <Card className="min-w-0 overflow-hidden shadow-surface-sm">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 px-3 pb-2 pt-3 sm:px-6 sm:pt-6">
        <CardTitle className="text-sm sm:text-base">
          <span className="sm:hidden">Top 5</span>
          <span className="hidden sm:inline">Top 5 Transactions</span>
        </CardTitle>
        <Select
          value={type}
          onValueChange={(value) => setType(value as TransactionFilterType)}
        >
          <SelectTrigger
            className="h-8 w-[6.5rem] sm:w-[140px]"
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
      <CardContent className="min-w-0 px-0 pb-2 pt-0 sm:px-6 sm:pb-6">
        {isLoading ? (
          <div className="space-y-2 px-3 py-2 sm:px-0">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-11 animate-pulse rounded-md bg-muted/40"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="px-3 py-8 text-center text-sm text-destructive sm:px-0">
            {(error as Error)?.message || 'Failed to load transactions.'}
          </p>
        ) : rows.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground sm:px-0">
            No {type.toLowerCase()} transactions in this period.
          </p>
        ) : (
          <>
            <div className="divide-y divide-border md:hidden">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      <MaskedPayee value={row.paymentMadeTo} />
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {format(new Date(row.transactionDate), 'dd MMM')}
                      <span aria-hidden> · </span>
                      {row.bankName}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    <FormattedAmount value={row.transactionValue} />
                  </p>
                </div>
              ))}
            </div>

            <div className="hidden w-full min-w-0 overflow-x-auto md:block">
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
                        {format(new Date(row.transactionDate), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        <FormattedAmount value={row.transactionValue} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
