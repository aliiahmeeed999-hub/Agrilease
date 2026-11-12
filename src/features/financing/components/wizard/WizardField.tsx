import type { ReactNode } from "react";
import { Field } from "@/components/ui/field";

// Wizard rows use the shared form row, so the application form has the same
// label spacing as every other form in the product.
export function WizardField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Field label={label} htmlFor={htmlFor} hint={hint}>
      {children}
    </Field>
  );
}
