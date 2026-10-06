import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BrandMark } from "./BrandMark";

type FormErrors = { email?: string; password?: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

// Faint court-line grid behind the brand panel text
const gridStyle = {
  backgroundImage:
    "linear-gradient(to right, rgb(255 255 255 / 0.06) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.06) 1px, transparent 1px)",
  backgroundSize: "96px 96px",
} as const;

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.45a5.52 5.52 0 0 1-2.39 3.62v3h3.87c2.27-2.09 3.57-5.17 3.57-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.87-3c-1.07.72-2.44 1.15-4.06 1.15-3.12 0-5.77-2.11-6.71-4.95H1.29v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.29 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.29a12 12 0 0 0 0 10.78l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.61 4.58 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.61l4 3.1C6.23 6.86 8.88 4.75 12 4.75Z"
      />
    </svg>
  );
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    // Phase 1 will call Firebase sign-in here, with persistence chosen by `remember`.
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[42%_1fr]">
      {/* Brand panel: hidden on small screens, where the form shows the logo instead */}
      <aside
        className="relative hidden items-center justify-center overflow-hidden bg-primary px-12 text-center lg:flex"
        style={gridStyle}
      >
        <div className="flex max-w-md flex-col items-center">
          <BrandMark tone="light" size="lg" />
          <h2 className="mt-10 text-3xl leading-tight text-white">Every court. Every booking. Under control.</h2>
          <p className="mt-4 text-sm text-white/80">
            A simpler way to manage tennis bookings, availability, and revenue.
          </p>
        </div>
      </aside>

      <main className="flex flex-col bg-page px-4 py-8">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <div className="flex justify-center">
              <BrandMark />
            </div>

            <div className="mt-6 text-center">
              <h1 className="text-2xl">Welcome back</h1>
              <p className="mt-1 text-sm text-muted">Sign in to manage your tennis center.</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
              <Input
                label="Email address"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="admin@servly.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                error={errors.email}
              />

              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                error={errors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    aria-pressed={showPassword}
                    className="flex size-7 items-center justify-center rounded-chip text-muted transition-colors hover:text-ink"
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                }
              />

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="size-4 rounded-chip accent-primary"
                  />
                  Remember me
                </label>
                {/* Wired to Firebase password reset in Phase 1 */}
                <button type="button" className="text-xs font-semibold text-primary hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" className="w-full">
                Sign in
              </Button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>

            {/* Wired to Google sign-in in Phase 1 */}
            <Button variant="secondary" className="w-full border-border">
              <GoogleIcon />
              Continue with Google
            </Button>

            <p className="mt-6 text-center text-xs text-muted">
              Don&apos;t have an account?{" "}
              <button type="button" className="font-semibold text-primary hover:underline">
                Create one
              </button>
            </p>

            {/* Temporary shortcut until sign-in is connected to Firebase */}
            <p className="mt-3 text-center text-xs">
              <Link to="/dashboard" className="font-semibold text-primary hover:underline">
                Go to dashboard &rarr;
              </Link>
            </p>
          </div>
        </div>

        <footer className="pt-8 text-center text-xs text-muted">
          &copy; {new Date().getFullYear()} Servly &middot; Terms &middot; Privacy
        </footer>
      </main>
    </div>
  );
}
