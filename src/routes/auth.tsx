import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Heart, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { ensureAuthReady, getSession, signIn, signUp } from "@/lib/clinic-storage";
import {
  RECEPTION_PASSWORD,
  isReceptionEmail,
  isReceptionStaff,
  receptionSignIn,
} from "@/lib/reception-api";

type PasswordStrength = "weak" | "medium" | "strong";

function getPasswordStrength(password: string): PasswordStrength | null {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score <= 2) return "weak";
  if (score <= 3) return "medium";
  return "strong";
}

const strengthLabel: Record<PasswordStrength, string> = {
  weak: "Weak",
  medium: "Medium",
  strong: "Strong",
};

const strengthClass: Record<PasswordStrength, string> = {
  weak: "text-destructive",
  medium: "text-amber-600",
  strong: "text-emerald-600",
};

const strengthBarClass: Record<PasswordStrength, string> = {
  weak: "w-1/3 bg-destructive",
  medium: "w-2/3 bg-amber-500",
  strong: "w-full bg-emerald-500",
};

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Bloom Clinic" },
      { name: "description", content: "Sign in or create an account to book appointments at Bloom Clinic." },
      { property: "og:title", content: "Sign in — Bloom Clinic" },
      { property: "og:description", content: "Warm, friendly clinic appointment booking." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      await ensureAuthReady();
      if (getSession()) {
        if (await isReceptionStaff()) {
          throw redirect({ to: "/reception" });
        }
        throw redirect({ to: "/doctors" });
      }
    }
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Block browser autofill until the user focuses a field.
  const [autofillReady, setAutofillReady] = useState(false);

  const passwordStrength = getPasswordStrength(password);

  useEffect(() => {
    setEmail("");
    setPassword("");
    setName("");
    // Chrome often fills saved credentials after the first paint.
    const clearId = window.setTimeout(() => {
      setEmail("");
      setPassword("");
      setName("");
    }, 50);
    return () => window.clearTimeout(clearId);
  }, []);

  const unlockAutofill = () => {
    if (!autofillReady) setAutofillReady(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const trimmedEmail = email.trim();

      if (mode === "signup") {
        if (isReceptionEmail(trimmedEmail)) {
          throw new Error("Reception staff should sign in, not create an account.");
        }
        if (!name.trim()) throw new Error("Please enter your name.");
        if (passwordStrength !== "strong") {
          throw new Error("Password must be strong.");
        }
        await signUp(name.trim(), trimmedEmail, password);
        toast.success(`Welcome, ${name.split(" ")[0]}!`);
        navigate({ to: "/doctors" });
        return;
      }

      if (isReceptionEmail(trimmedEmail)) {
        if (password !== RECEPTION_PASSWORD) {
          throw new Error("Invalid email or password.");
        }
        await receptionSignIn(trimmedEmail, password);
        toast.success("Welcome, reception desk.");
        navigate({ to: "/reception" });
        return;
      }

      await signIn(trimmedEmail, password);
      toast.success("Welcome back!");
      navigate({ to: "/doctors" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <div className="bg-warm-gradient relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-secondary/40 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-peach-gradient shadow-soft">
            <Stethoscope className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="font-display text-4xl">Bloom Clinic</h1>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
            <Heart className="h-4 w-4 text-primary" />
            Care that feels like home
          </p>
        </div>

        <div className="w-full rounded-3xl border border-border/60 bg-card p-6 shadow-card">
          <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
            <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted p-1">
              <TabsTrigger value="signin" className="rounded-full">Sign in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full">Sign up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="off">
              <TabsContent value="signup" className="mt-0 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    name="bloom-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onFocus={unlockAutofill}
                    readOnly={!autofillReady}
                    placeholder="Sara Ahmed"
                    required={mode === "signup"}
                    autoComplete="off"
                    className="h-11 rounded-xl"
                  />
                </div>
              </TabsContent>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="bloom-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={unlockAutofill}
                  readOnly={!autofillReady}
                  placeholder="you@email.com"
                  required
                  autoComplete="off"
                  className="h-11 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="bloom-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={unlockAutofill}
                    readOnly={!autofillReady}
                    placeholder="••••••••"
                    required
                    className="h-11 rounded-xl pr-11"
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {mode === "signup" && passwordStrength && (
                  <div className="space-y-1.5 pt-1" aria-live="polite">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all ${strengthBarClass[passwordStrength]}`}
                      />
                    </div>
                    <p className={`text-xs font-medium ${strengthClass[passwordStrength]}`}>
                      Password strength: {strengthLabel[passwordStrength]}
                    </p>
                    {passwordStrength !== "strong" && (
                      <p className="text-xs text-muted-foreground">
                        Use 8+ characters with upper &amp; lowercase, a number, and a symbol.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-full bg-peach-gradient text-base shadow-soft hover:opacity-95"
              >
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>
          </Tabs>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Your appointments are saved securely to your clinic account.
          </p>
        </div>
      </div>
    </div>
  );
}
