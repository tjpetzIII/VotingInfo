import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "./AuthContext";

const getUser = vi.fn();
const signOut = vi.fn();
let authStateCallback: ((event: string, session: { user: { email: string } } | null) => void) | null =
  null;
const unsubscribe = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getUser,
      signOut,
      onAuthStateChange: (cb: typeof authStateCallback) => {
        authStateCallback = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
  }),
}));

function Probe() {
  const { user, loading, signOut: doSignOut } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="email">{user?.email ?? "none"}</span>
      <button onClick={doSignOut}>Sign Out</button>
    </div>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    getUser.mockReset();
    signOut.mockReset();
    unsubscribe.mockReset();
    authStateCallback = null;
  });

  it("starts loading and resolves the current user from getUser", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "voter@example.com" } } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    expect(screen.getByTestId("loading")).toHaveTextContent("true");
    expect(await screen.findByTestId("email")).toHaveTextContent("voter@example.com");
    expect(screen.getByTestId("loading")).toHaveTextContent("false");
  });

  it("resolves to no user when getUser returns null", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );

    await screen.findByText("false");
    expect(screen.getByTestId("email")).toHaveTextContent("none");
  });

  it("updates the user when the auth state changes", async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await screen.findByText("false");

    authStateCallback?.("SIGNED_IN", { user: { email: "new@example.com" } });

    expect(await screen.findByTestId("email")).toHaveTextContent("new@example.com");
  });

  it("calls supabase signOut when signOut is invoked", async () => {
    getUser.mockResolvedValue({ data: { user: { email: "voter@example.com" } } });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>
    );
    await screen.findByText("voter@example.com");

    await user.click(screen.getByRole("button", { name: "Sign Out" }));
    expect(signOut).toHaveBeenCalled();
  });

  it("throws when useAuth is used outside of AuthProvider", () => {
    function Bare() {
      useAuth();
      return null;
    }
    expect(() => render(<Bare />)).toThrow("useAuth must be used within AuthProvider");
  });
});
