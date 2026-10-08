import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthLayout } from "./AuthLayout";
import { friendlyAuthError, sendPasswordReset, signInWithEmail, signInWithGoogle } from "./auth.service";
import { GoogleIcon } from "./GoogleIcon";
import { PasswordToggle } from "./PasswordToggle";
import { clearSignOutNotice, peekSignOutNotice } from "./sessionNotice";
import { EMAIL_PATTERN } from "./validation";

type FormErrors = { email?: string; password?: string };

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
}

export function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  // Set when the app signed this person out by itself (inactivity, access removed)
  const [notice, setNotice] = useState<string | null>(peekSignOutNotice);
  const [busy, setBusy] = useState(false);

  // Read above and cleared here, because React may run a state initializer twice in development
  useEffect(() => clearSignOutNotice(), []);

  // Runs a sign-in action with the shared busy/error handling. On success the auth guard moves the user on.
  async function run(action: () => Promise<void>) {
    setFormError(null);
    setNotice(null);
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setFormError(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void run(() => signInWithEmail(email, password, remember));
  }

  function handleForgotPassword() {
    if (!email.trim() || !EMAIL_PATTERN.test(email.trim())) {
      setErrors({ email: "Enter your email address above, then choose “Forgot password?”." });
      return;
    }
    setErrors({});
    void run(async () => {
      await sendPasswordReset(email);
      // Same message whether or not the address has an account, so this can't be used to look up who is registered
      setNotice(`If an account exists for ${email.trim()}, we've sent a link to reset the password.`);
    });
  }

  return (
    <AuthLayout>
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
          trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
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
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={busy}
            className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
          >
            Forgot password?
          </button>
        </div>

        {formError && (
          <p role="alert" className="rounded-button bg-danger-soft px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-button bg-success-soft px-3 py-2 text-xs text-success">
            {notice}
          </p>
        )}

        <Button type="submit" className="w-full" loading={busy}>
          {busy ? "Please wait…" : "Sign in"}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        variant="secondary"
        className="w-full border-border"
        disabled={busy}
        onClick={() => void run(() => signInWithGoogle(remember))}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-xs text-muted">
        Don&apos;t have an account?{" "}
        <Link to="/signup" className="font-semibold text-primary hover:underline">
          Create one
        </Link>
      </p>
    </AuthLayout>
  );
}
