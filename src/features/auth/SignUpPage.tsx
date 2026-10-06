import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AuthLayout } from "./AuthLayout";
import { friendlyAuthError, signInWithGoogle, signUpWithEmail } from "./auth.service";
import { GoogleIcon } from "./GoogleIcon";
import { PasswordToggle } from "./PasswordToggle";
import { EMAIL_PATTERN, MIN_PASSWORD_LENGTH } from "./validation";

type FormErrors = { name?: string; email?: string; password?: string };

function validate(name: string, email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = "Enter your name.";
  if (!email.trim()) errors.email = "Enter your email address.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "Enter a valid email address.";
  if (password.length < MIN_PASSWORD_LENGTH) errors.password = `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  return errors;
}

export function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<void>) {
    setFormError(null);
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
    const found = validate(name, email, password);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void run(() => signUpWithEmail(name, email, password));
  }

  return (
    <AuthLayout>
      <div className="mt-6 text-center">
        <h1 className="text-2xl">Create your account</h1>
        <p className="mt-1 text-sm text-muted">An administrator will approve your account before you can sign in.</p>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <Input
          label="Full name"
          name="name"
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={errors.name}
        />

        <Input
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />

        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          name="password"
          autoComplete="new-password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          trailing={<PasswordToggle shown={showPassword} onToggle={() => setShowPassword((shown) => !shown)} />}
        />

        {formError && (
          <p role="alert" className="rounded-button bg-danger-soft px-3 py-2 text-xs text-danger">
            {formError}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
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
        onClick={() => void run(() => signInWithGoogle(true))}
      >
        <GoogleIcon />
        Continue with Google
      </Button>

      <p className="mt-6 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
