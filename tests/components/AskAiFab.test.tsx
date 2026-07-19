import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AskAiFab } from "@/components/AskAiFab";

const chatSpy = vi.fn();
vi.mock("@tanstack/react-start", () => ({
  useServerFn: () => chatSpy,
}));
vi.mock("@/lib/ai.functions", () => ({ aiChat: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

describe("<AskAiFab />", () => {
  it("renders floating button with aria-label", () => {
    render(<AskAiFab />);
    expect(screen.getByLabelText(/Ask AI/i)).toBeInTheDocument();
  });

  it("opens panel on click and shows empty state", async () => {
    render(<AskAiFab />);
    await userEvent.click(screen.getByLabelText(/Ask AI/i));
    expect(screen.getByPlaceholderText(/Ask anything/i)).toBeInTheDocument();
    expect(screen.getByText(/Shortcut: Ctrl\/Cmd \+ K/i)).toBeInTheDocument();
  });

  it("toggles open via Ctrl+K shortcut and closes via Escape", async () => {
    render(<AskAiFab />);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(await screen.findByPlaceholderText(/Ask anything/i)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Ask anything/i)).not.toBeInTheDocument(),
    );
  });

  it("sends a message and renders the assistant reply", async () => {
    chatSpy.mockResolvedValueOnce({ text: "Hello student!" });
    render(<AskAiFab />);
    await userEvent.click(screen.getByLabelText(/Ask AI/i));
    const input = screen.getByPlaceholderText(/Ask anything/i);
    await userEvent.type(input, "Hi");
    // Enter to send
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(chatSpy).toHaveBeenCalled());
    expect(await screen.findByText(/Hello student!/i)).toBeInTheDocument();
  });
});
