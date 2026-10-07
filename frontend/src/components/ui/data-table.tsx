"use client";

import * as React from "react";
import {
  ColumnDef,
  RowData,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { Skeleton } from "@/components/ui/skeleton";

// Alias useTable to useReactTable for flexible usage
export const useTable = useReactTable;

export interface DataTableProps<TData extends RowData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];
  onRowClick?: (row: TData) => void;
  pageSize?: number;
  emptyMessage?: React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  onRowClick,
  pageSize = 15,
  emptyMessage = "No results.",
  isLoading = false,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize,
        pageIndex: 0,
      },
    },
  });

  React.useEffect(() => {
    table.setPageSize(pageSize);
  }, [pageSize, table]);

  return (
    <div>
      <div className="overflow-hidden rounded-md border border-[#e5e4de] bg-white shadow-xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, rIdx) => (
                <TableRow key={`skeleton-row-${rIdx}`} className="hover:bg-transparent">
                  {columns.map((_, cIdx) => (
                    <TableCell key={`skeleton-cell-${cIdx}`} className="py-3 px-3">
                      <Skeleton
                        className="h-4"
                        style={{
                          width:
                            cIdx === 0
                              ? "24px"
                              : cIdx === 1
                              ? "55%"
                              : cIdx === columns.length - 1
                              ? "45px"
                              : "70%",
                          margin: cIdx === 0 ? "0 auto" : undefined,
                        }}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={onRowClick ? "cursor-pointer transition-colors hover:bg-[#f6f5ef]" : undefined}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-28 text-center text-[#6b6a68]">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-xs text-[#6b6a68]">
          {data.length > 0 ? (
            <span>
              បង្ហាញ{" "}
              <strong className="text-[#1f1e1d]">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </strong>{" "}
              -{" "}
              <strong className="text-[#1f1e1d]">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  data.length
                )}
              </strong>{" "}
              នៃ <strong className="text-[#1f1e1d]">{data.length}</strong> ប្រតិបត្តិការ
            </span>
          ) : null}
        </div>

        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <span className="text-xs font-semibold px-2 text-[#6b6a68]">
            {table.getPageCount() > 0
              ? `${table.getState().pagination.pageIndex + 1} / ${table.getPageCount()}`
              : "0 / 0"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
