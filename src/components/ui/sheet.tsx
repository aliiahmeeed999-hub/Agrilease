"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"

import { cn } from "@/utils/cn"

// A panel that slides in from the inline-start edge (left in English/French,
// right in Arabic). Built on Base UI's Dialog, so focus is trapped inside it,
// Escape and a tap on the scrim close it, the page behind stops scrolling,
// and focus returns to the button that opened it.
//
// It enters and leaves along the same path, and the scrim dims the page
// because this is a modal task: the user should finish or dismiss it.

function Sheet(props: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger(props: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose(props: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetContent({
  className,
  children,
  ...props
}: DialogPrimitive.Popup.Props) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-backdrop"
        className="fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 data-ending-style:opacity-0 data-starting-style:opacity-0"
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(
          "fixed inset-y-0 start-0 z-50 flex w-[min(20rem,85vw)] flex-col bg-sidebar text-sidebar-foreground shadow-xl outline-none",
          "border-e border-border transition-transform duration-300 ease-out-quint",
          "data-ending-style:-translate-x-full data-starting-style:-translate-x-full",
          "rtl:data-ending-style:translate-x-full rtl:data-starting-style:translate-x-full",
          // Keep clear of the notch and the home indicator on phones.
          "pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  )
}

function SheetTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn("type-headline", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetTitle, SheetDescription }
