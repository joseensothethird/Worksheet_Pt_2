import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthForm from "../app/auth/page"; // adjust path if needed
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
    },
  },
}));

describe("AuthForm Component", () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
    jest.clearAllMocks();
  });

  // ✅ 1. Test field labels
  it("renders correct input field labels", () => {
    render(<AuthForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  // ✅ 2. Test password field type
  it("password field should be of type password", () => {
    render(<AuthForm />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // ✅ 3. Test error message for invalid credentials
  it("shows error message on invalid credentials", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      error: { message: "Invalid login credentials" },
    });

    render(<AuthForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrongpassword" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    );
  });

  // ✅ 4. Test password mismatch during registration
  it("displays error when passwords do not match during registration", async () => {
    render(<AuthForm />);

    fireEvent.click(screen.getByText(/create an account/i));

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "123456" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "654321" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });
});
describe("AuthForm Integration Tests", () => {
  const mockReplace = jest.fn();
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
  });

  // ✅ 1. Valid login credentials return expected user object
  it("calls supabase.signInWithPassword with correct data", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "123", email: "test@test.com" } },
      error: null,
    });

    render(<AuthForm />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "test@test.com",
        password: "123456",
      });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  // ✅ 2. Valid signup credentials return expected status (no error)
  it("signs up successfully when registration info is valid", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "1", email: "new@test.com" } },
      error: null,
    });

    render(<AuthForm />);

    fireEvent.click(screen.getByText(/create an account/i));

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@test.com" },
    });
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "abcdef" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "abcdef" },
    });

    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() =>
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "new@test.com",
        password: "abcdef",
      })
    );
  });
});
