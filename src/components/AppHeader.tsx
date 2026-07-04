import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Calendar, LogOut, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSession, signOut } from "@/lib/clinic-storage";

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? getSession() : null;

  if (pathname === "/" || pathname === "/auth") return null;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
        <Link to="/doctors" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-peach-gradient text-primary-foreground shadow-soft">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="font-display text-lg leading-none">Bloom Clinic</div>
            {session && (
              <div className="text-xs text-muted-foreground">Hi, {session.name.split(" ")[0]}</div>
            )}
          </div>
        </Link>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/appointments" })}
            className="rounded-full"
          >
            <Calendar className="mr-1.5 h-4 w-4" />
            My visits
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            onClick={() => {
              void signOut().then(() => navigate({ to: "/auth" }));
            }}
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
