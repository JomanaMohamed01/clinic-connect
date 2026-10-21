import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Calendar, LogOut, Stethoscope } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getSession, signOut } from "@/lib/clinic-storage";

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? getSession() : null;

  if (pathname === "/" || pathname === "/auth") return null;

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center px-5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-left outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0"
              aria-label="Open clinic menu"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-peach-gradient text-primary-foreground shadow-soft">
                <Stethoscope className="h-5 w-5" />
              </div>
              <div>
                <div className="font-display text-lg leading-none">Bloom Clinic</div>
                {session && (
                  <div className="text-xs text-muted-foreground">Hi, {session.name.split(" ")[0]}</div>
                )}
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={8}
            className="w-56 rounded-2xl border-border/70 p-2 shadow-card"
          >
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-xl px-2.5 py-2.5"
              onSelect={() => navigate({ to: "/appointments" })}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-primary">
                <Calendar className="h-4 w-4" />
              </span>
              My visits
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-xl px-2.5 py-2.5"
              onSelect={() => {
                void signOut().then(() => navigate({ to: "/auth" }));
              }}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <LogOut className="h-4 w-4" />
              </span>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
