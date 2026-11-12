import * as React from "react"

import { cn } from "@/utils/cn"
import { Label } from "@/components/ui/label"

// One form row: label, control, then either a hint or an error. The same
// spacing and the same place for messages on every form, and the error is
// announced to screen readers the moment it appears.
//
// Pass the same id to `htmlFor` and to the control. For the control, also set
// aria-invalid={!!error} and aria-describedby={fieldMessageId(id)} so the
// message is read with the field.
function Field({
  label,
  htmlFor,
  optionalLabel,
  hint,
  error,
  className,
  children,
}: {
  label: React.ReactNode
  htmlFor?: string
  // Translated "(optional)" marker, shown after the label.
  optionalLabel?: string
  hint?: React.ReactNode
  error?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  const messageId = htmlFor ? fieldMessageId(htmlFor) : undefined
  return (
    <div data-slot="field" className={cn("flex min-w-0 flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {optionalLabel && <span className="font-normal text-muted-foreground">({optionalLabel})</span>}
      </Label>
      {children}
      {error ? (
        <p id={messageId} role="alert" className="text-sm leading-snug text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="text-sm leading-snug text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function fieldMessageId(id: string) {
  return `${id}-message`
}

// A form-level problem (the request failed, the server refused it).
function FormError({ children, className }: { children: React.ReactNode; className?: string }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm leading-snug text-destructive",
        className
      )}
    >
      {children}
    </div>
  )
}

export { Field, FormError, fieldMessageId }
