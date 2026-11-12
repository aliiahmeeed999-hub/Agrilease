import { AiSubNav } from "@/features/ai/components/AiSubNav";

export default function AiLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <AiSubNav />
      {children}
    </div>
  );
}
