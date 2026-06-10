'use client';

import * as React from 'react';
import { ArrowDown } from 'lucide-react';

import { TableHead } from '@repo/ui/table';
import { cn } from '@repo/ui/lib/utils';

import type {
  TransactionSortField,
  TransactionSortOrder,
} from '../types/transaction';
import { TRANSACTION_SORT_ORDER } from '../types/transaction';

interface ResizableTableHeadProps
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  onResizeStart?: (clientX: number) => void;
  resizable?: boolean;
}

export function ResizableTableHead({
  children,
  onResizeStart,
  resizable = true,
  className,
  ...props
}: ResizableTableHeadProps) {
  return (
    <TableHead className={cn('relative overflow-hidden', className)} {...props}>
      <div className="truncate pr-2">{children}</div>
      {resizable && onResizeStart ? (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize column"
          className="group/resize absolute right-0 top-0 z-10 flex h-full w-3 cursor-col-resize touch-none items-center justify-center"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onResizeStart(event.clientX);
          }}
        >
          <span
            aria-hidden="true"
            className="h-3/4 w-px bg-muted-foreground/35 transition-colors group-hover/resize:bg-primary/80 group-active/resize:bg-primary"
          />
        </div>
      ) : null}
    </TableHead>
  );
}

interface ResizableSortableTableHeadProps {
  label: string;
  field: TransactionSortField;
  sortBy: TransactionSortField;
  sortOrder: TransactionSortOrder;
  onSort: (field: TransactionSortField) => void;
  onResizeStart?: (clientX: number) => void;
  resizable?: boolean;
  className?: string;
}

export function ResizableSortableTableHead({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  onResizeStart,
  resizable = true,
  className,
}: ResizableSortableTableHeadProps) {
  const isActive = sortBy === field;

  return (
    <ResizableTableHead
      onResizeStart={onResizeStart}
      resizable={resizable}
      className={className}
    >
      <button
        type="button"
        className="inline-flex max-w-full items-center gap-1 truncate font-medium hover:text-foreground"
        onClick={() => onSort(field)}
      >
        {label}
        <ArrowDown
          aria-hidden="true"
          className={cn(
            'h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none',
            isActive
              ? sortOrder === TRANSACTION_SORT_ORDER.ASC
                ? 'rotate-180 opacity-100'
                : 'rotate-0 opacity-100'
              : 'opacity-0',
          )}
        />
      </button>
    </ResizableTableHead>
  );
}
