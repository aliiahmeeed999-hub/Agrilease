"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { DirectionProvider } from "@base-ui/react/direction-provider";
import { isRtlLocale } from "@/i18n/routing";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Tells Base UI which way the interface reads, so sliders fill from the
  // right, arrow keys move the expected way and menus open on the correct
  // side in Arabic.
  const direction = isRtlLocale(useLocale()) ? "rtl" : "ltr";

  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider direction={direction}>
        <TooltipProvider>{children}</TooltipProvider>
      </DirectionProvider>
    </QueryClientProvider>
  );
}
