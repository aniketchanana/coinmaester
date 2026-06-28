'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/table';

import type { AnalyticsPayeeBreakdown } from '../types/analytics';
import { REVEAL_UP_CLASS } from '../lib/motion';
import { FormattedAmount } from './formatted-amount';
import { MaskedPayee } from './masked-payee';

interface AnalyticsTopPayeesProps {
  byPayee: AnalyticsPayeeBreakdown[];
}

export function AnalyticsTopPayees({ byPayee }: AnalyticsTopPayeesProps) {
  return (
    <div
      className={`rounded-lg border border-surface bg-card p-4 shadow-surface-sm backdrop-blur-surface ${REVEAL_UP_CLASS}`}
    >
      <p className="mb-4 text-sm font-medium">Top Payees</p>
      {byPayee.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payee</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byPayee.map((row) => (
              <TableRow key={row.payee}>
                <TableCell className="max-w-[240px] truncate">
                  <MaskedPayee value={row.payee} />
                </TableCell>
                <TableCell className="text-right font-medium">
                  <FormattedAmount value={row.debit} />
                </TableCell>
                <TableCell className="text-right">
                  <FormattedAmount value={row.credit} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">
          No payee data available.
        </p>
      )}
    </div>
  );
}

export function AnalyticsTopPayeesSkeleton() {
  return (
    <div className="rounded-lg border border-surface bg-card p-4 shadow-surface-sm">
      <div className="mb-4 h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-8 animate-pulse rounded bg-muted/50" />
        ))}
      </div>
    </div>
  );
}
