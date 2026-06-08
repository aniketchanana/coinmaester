'use client';

import * as React from 'react';

const MIN_COLUMN_WIDTH = 60;

type ColumnWidths<T extends string> = Record<T, number>;

function readStoredColumnWidths<T extends string>(
  storageKey: string,
  initialWidths: ColumnWidths<T>,
): ColumnWidths<T> | null {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const merged = { ...initialWidths };

    for (const key of Object.keys(initialWidths) as T[]) {
      const value = parsed[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        merged[key] = Math.max(MIN_COLUMN_WIDTH, value);
      }
    }

    return merged;
  } catch {
    return null;
  }
}

export function useResizableColumns<T extends string>(
  initialWidths: ColumnWidths<T>,
  storageKey?: string,
) {
  const [columnWidths, setColumnWidths] =
    React.useState<ColumnWidths<T>>(initialWidths);
  const columnWidthsRef = React.useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const resizingRef = React.useRef<{
    columnId: T;
    startX: number;
    startWidth: number;
  } | null>(null);

  React.useEffect(() => {
    if (!storageKey) {
      return;
    }

    const storedWidths = readStoredColumnWidths(storageKey, initialWidths);
    if (storedWidths) {
      setColumnWidths(storedWidths);
    }
  }, [storageKey, initialWidths]);

  const persistColumnWidths = React.useCallback(() => {
    if (!storageKey) {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(columnWidthsRef.current));
  }, [storageKey]);

  React.useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizingRef.current) {
        return;
      }

      const { columnId, startX, startWidth } = resizingRef.current;
      const nextWidth = Math.max(
        MIN_COLUMN_WIDTH,
        startWidth + (event.clientX - startX),
      );

      setColumnWidths((current) => ({
        ...current,
        [columnId]: nextWidth,
      }));
    };

    const handleMouseUp = () => {
      const wasResizing = resizingRef.current !== null;
      resizingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      if (wasResizing) {
        persistColumnWidths();
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [persistColumnWidths]);

  const startResize = React.useCallback(
    (columnId: T, clientX: number) => {
      resizingRef.current = {
        columnId,
        startX: clientX,
        startWidth: columnWidths[columnId],
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    },
    [columnWidths],
  );

  return { columnWidths, startResize };
}
