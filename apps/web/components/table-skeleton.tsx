import { TableCell, TableRow } from '@repo/ui/table';

const SKELETON_WIDTHS = ['72%', '48%', '56%', '40%', '80%', '36%'] as const;

interface TableSkeletonProps {
  columns: number;
  rows?: number;
}

export function TableSkeleton({ columns, rows = 8 }: TableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }, (_, rowIndex) => (
        <TableRow
          key={rowIndex}
          className="animate-pulse hover:bg-transparent motion-reduce:animate-none"
          style={{
            animationDelay: `${rowIndex * 60}ms`,
            animationFillMode: 'both',
          }}
        >
          {Array.from({ length: columns }, (_, columnIndex) => (
            <TableCell key={columnIndex}>
              <div
                className="h-4 rounded-md bg-muted/70"
                style={{
                  width: SKELETON_WIDTHS[columnIndex % SKELETON_WIDTHS.length],
                }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
