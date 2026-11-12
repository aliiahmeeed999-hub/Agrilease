"use client"

import { useFormatter } from "next-intl"

import { cn } from "@/utils/cn"

// A dashboard figure, formatted for the reader's language. Shown as it is:
// counting up from zero on every visit makes a number slower to read and
// adds nothing for someone who checks the same dashboard daily.
function StatValue({
  value,
  prefix,
  suffix,
  className,
}: {
  value: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const format = useFormatter()
  return (
    <span className={cn("tabular", className)}>
      {prefix}
      {format.number(value)}
      {suffix}
    </span>
  )
}

export { StatValue }
