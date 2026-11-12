import { Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/states/EmptyState";

// Shown when a page calls notFound() (for example an unknown locale or a
// record that no longer exists): says what happened and offers a way out,
// instead of the framework's bare default page.
export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main id="main-content" className="flex min-h-dvh items-center justify-center px-4 py-12">
      <EmptyState
        icon={Compass}
        title={t("notFoundTitle")}
        description={t("notFoundDescription")}
        className="w-full max-w-md border-solid"
        action={
          <Link href="/" className={buttonVariants()}>
            {t("goHome")}
          </Link>
        }
      />
    </main>
  );
}
