import type { ReactNode } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, cn } from 'ferry-ui'

/** Props of {@link DocTable}. */
export interface DocTableProps {
  /** Accessible name of the table ("Parameters of Drift"). */
  label: string
  /** The column titles, in order. */
  columns: readonly string[]
  /** The rows: {@link DocRow}s. */
  children: ReactNode
}

/**
 * A reference table: a ferry-ui `Table` with column titles in sentence case (this page has no
 * uppercase labels). It scrolls sideways on a narrow screen, and the keyboard can reach it.
 */
export function DocTable({ label, columns, children }: DocTableProps) {
  return (
    <Table
      aria-label={label}
      containerProps={{ tabIndex: 0, role: 'region', 'aria-label': label }}
      // In dark, the `none` of `--shadow-card` makes the `box-shadow` of the container invalid, and
      // its focus ring is lost. `shadow-none` keeps the ring: the dark table has no shadow anyway.
      containerClassName="dark:shadow-none"
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {columns.map((column) => (
            <TableHead key={column} className="font-sans text-xs tracking-normal normal-case">
              {column}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>{children}</TableBody>
    </Table>
  )
}

/** One row of a {@link DocTable}. */
export function DocRow({ children }: { children: ReactNode }) {
  return <TableRow className="hover:bg-transparent">{children}</TableRow>
}

/** A cell that holds code: a name, a type, a default. */
export function CodeCell({ className, children }: { className?: string; children: ReactNode }) {
  return <TableCell className={cn('py-3 align-top font-mono text-[12.5px] leading-5', className)}>{children}</TableCell>
}

/** A cell that holds a sentence. It wraps, and keeps a width that reads well. */
export function TextCell({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <TableCell className={cn('min-w-72 py-3 align-top text-[13px] leading-5 whitespace-normal text-foreground-light', className)}>
      {children}
    </TableCell>
  )
}
