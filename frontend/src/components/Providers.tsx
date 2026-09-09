"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { IntlProvider } from "react-intl";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { AddressProvider, VOTING_DATA_CLEARED_EVENT } from "@/contexts/AddressContext";
import { ElectionProvider } from "@/contexts/ElectionContext";
import { AuthProvider } from "@/contexts/AuthContext";
import enMessages from "@/messages/en";
import esMessages from "@/messages/es";

// Cast required for React 19 compatibility (react-intl uses class component types)
const SafeIntlProvider = IntlProvider as any;

function IntlWrapper({ children }: { children: ReactNode }) {
  const { locale } = useLocale();
  const messages = locale === "es" ? esMessages : enMessages;
  return (
    <SafeIntlProvider locale={locale} messages={messages}>
      {children}
    </SafeIntlProvider>
  );
}

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            retry: 3,
            retryDelay: (attemptIndex: number) =>
              Math.min(1000 * 2 ** attemptIndex, 30_000),
          },
        },
      })
  );

  useEffect(() => {
    const clear = () => queryClient.clear();
    window.addEventListener(VOTING_DATA_CLEARED_EVENT, clear);
    return () => window.removeEventListener(VOTING_DATA_CLEARED_EVENT, clear);
  }, [queryClient]);

  return (
    <AddressProvider>
      <LocaleProvider>
        <IntlWrapper>
          <QueryClientProvider client={queryClient}>
            <ElectionProvider><AuthProvider>
              {children}
            </AuthProvider></ElectionProvider>
          </QueryClientProvider>
        </IntlWrapper>
      </LocaleProvider>
    </AddressProvider>
  );
}
