"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { IntlProvider } from "react-intl";
import { LocaleProvider, useLocale } from "@/contexts/LocaleContext";
import { AuthProvider } from "@/contexts/AuthContext";
import enMessages from "@/messages/en";
import esMessages from "@/messages/es";

// Cast required for React 19 compatibility (react-intl uses class component types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  return (
    <LocaleProvider>
      <IntlWrapper>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </IntlWrapper>
    </LocaleProvider>
  );
}
