import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AuthForm from "../app/auth/page";
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

  // ✅ Unit Test 1: Correct input field labels
  it("renders correct input field labels", () => {
    render(<AuthForm />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  // ✅ Unit Test 2: Password field type
  it("password field should be of type password", () => {
    render(<AuthForm />);
    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute("type", "password");
  });

  // ✅ Unit Test 3: Invalid login error
  it("shows error message on invalid credentials", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: { message: "Invalid login credentials" },
    });

    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jamesjebery@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "wrongpassword" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
    );
  });

  // ✅ Unit Test 4: Password mismatch in registration
  it("displays error when passwords do not match during registration", async () => {
    render(<AuthForm />);
    fireEvent.click(screen.getByText(/create an account/i));

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jamesjebery@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "ensojose" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "differentpassword" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    expect(await screen.findByText(/passwords do not match/i)).toBeInTheDocument();
  });
});

describe("AuthForm Integration Tests", () => {
  const mockReplace = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });
    jest.clearAllMocks();
  });

  // ✅ Integration Test 1: Successful login should redirect to "/"
  it("logs in successfully and redirects to /", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "123", email: "jamesjebery@gmail.com" } },
      error: null,
    });

    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jamesjebery@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "ensojose" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "jamesjebery@gmail.com",
        password: "ensojose",
      });
      expect(mockReplace).toHaveBeenCalledWith("/");
    });
  });

  // ✅ Integration Test 2: Successful signup with valid info
  it("signs up successfully when registration info is valid", async () => {
    (supabase.auth.signUp as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "1", email: "jamesjebery@gmail.com" } },
      error: null,
    });

    render(<AuthForm />);
    fireEvent.click(screen.getByText(/create an account/i));

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jamesjebery@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/^password$/i), { target: { value: "ensojose" } });
    fireEvent.change(screen.getByLabelText(/confirm password/i), { target: { value: "ensojose" } });
    fireEvent.click(screen.getByRole("button", { name: /register/i }));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: "jamesjebery@gmail.com",
        password: "ensojose",
      });
    });
  });

  // ✅ Additional Test: Test with Gmail variations using the same base email
  it("handles Gmail address correctly", async () => {
    (supabase.auth.signInWithPassword as jest.Mock).mockResolvedValueOnce({
      data: { user: { id: "456", email: "jamesjebery@gmail.com" } },
      error: null,
    });

    render(<AuthForm />);
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "jamesjebery@gmail.com" } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: "ensojose" } });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: "jamesjebery@gmail.com",
        password: "ensojose",
      });
    });
  });
});