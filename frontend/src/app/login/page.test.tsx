import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { signInWithPassword, signUp },
  }),
}));

import LoginPage from "./page";

function submitButton() {
  return screen
    .getAllByRole("button", { name: "Sign In" })
    .find((b) => b.getAttribute("type") === "submit")!;
}

describe("LoginPage", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    signUp.mockReset();
    push.mockReset();
    refresh.mockReset();
  });

  it("shows validation errors when submitting an empty form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(submitButton());

    expect(await screen.findByText("Enter a valid email")).toBeInTheDocument();
    expect(screen.getByText("Password must be at least 6 characters")).toBeInTheDocument();
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("signs in and redirects home on success", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "voter@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(submitButton());

    await vi.waitFor(() => {
      expect(signInWithPassword).toHaveBeenCalledWith({
        email: "voter@example.com",
        password: "password123",
      });
    });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/"));
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the server error message when sign-in fails", async () => {
    const user = userEvent.setup();
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid credentials" } });
    render(<LoginPage />);

    await user.type(screen.getByPlaceholderText("you@example.com"), "voter@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(submitButton());

    expect(await screen.findByText("Invalid credentials")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("switches to the Sign Up tab and creates an account", async () => {
    const user = userEvent.setup();
    signUp.mockResolvedValue({ error: null });
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "Sign Up" }));
    expect(screen.getByText("Create your account")).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText("you@example.com"), "new@example.com");
    await user.type(screen.getByPlaceholderText("••••••••"), "password123");
    await user.click(screen.getByRole("button", { name: "Create Account" }));

    await vi.waitFor(() => {
      expect(signUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "password123",
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
    });
    expect(
      await screen.findByText("Check your email for a confirmation link.")
    ).toBeInTheDocument();
  });
});
