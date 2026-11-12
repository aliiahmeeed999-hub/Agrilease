import { MarketingNav } from "@/features/landing/components/MarketingNav";
import { MarketingFooter } from "@/features/landing/components/MarketingFooter";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <MarketingNav />
      {children}
      <MarketingFooter />
    </div>
  );
}
