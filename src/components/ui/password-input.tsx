"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"
import { cn } from "@/utils/cn"

// A password field with a show/hide button. On a phone keyboard a typo in a
// hidden password is the most common reason a sign-in fails.
function PasswordInput({ className, ...props }: Omit<React.ComponentProps<"input">, "type">) {
  const t = useTranslations("auth")
  const [visible, setVisible] = React.useState(false)
  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        dir="ltr"
        className={cn("pe-12 text-start", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hidePassword") : t("showPassword")}
        aria-pressed={visible}
        className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-xl text-muted-foreground transition-colors hover:text-foreground"
      >
        {visible ? <EyeOff className="size-4.5" aria-hidden="true" /> : <Eye className="size-4.5" aria-hidden="true" />}
      </button>
    </div>
  )
}

export { PasswordInput }
