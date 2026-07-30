import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useIntl } from "react-intl";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/contexts/LocaleContext";
import { useAddress } from "@/contexts/AddressContext";
import { useAuth } from "@/contexts/AuthContext";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  }),
}));

import Providers from "./Providers";

function Probe() {
  const intl = useIntl();
  const { locale, setLocale } = useLocale();
  const { address } = useAddress();
  const { loading } = useAuth();
  const { data } = useQuery({ queryKey: ["probe"], queryFn: async () => "ok" });

  return (
    <div>
      <span data-testid="message">{intl.formatMessage({ id: "footer.copyright" }, { year: 2026 })}</span>
      <span data-testid="locale">{locale}</span>
      <span data-testid="address">{address ? "has-address" : "no-address"}</span>
      <span data-testid="auth-loading">{String(loading)}</span>
      <span data-testid="query">{data ?? "pending"}</span>
      <button onClick={() => setLocale("es")}>Switch</button>
    </div>
  );
}

describe("Providers", () => {
  it("wires up locale, address, query, and auth context for descendants", async () => {
    const user = userEvent.setup();
    render(
      <Providers>
        <Probe />
      </Providers>
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
    expect(screen.getByTestId("address")).toHaveTextContent("no-address");
    expect(
      screen.getByTestId("message")
    ).toHaveTextContent("© 2026 VoteReady. Empowering voters everywhere.");
    expect(await screen.findByTestId("query")).toHaveTextContent("ok");
    await screen.findByText("false", { selector: '[data-testid="auth-loading"]' });

    await user.click(screen.getByRole("button", { name: "Switch" }));
    expect(screen.getByTestId("locale")).toHaveTextContent("es");
    expect(screen.getByTestId("message")).toHaveTextContent(
      "© 2026 VoteReady. Empoderando votantes en todas partes."
    );
  });
});
