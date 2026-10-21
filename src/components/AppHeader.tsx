import { useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Calendar, LogOut, Stethoscope, UserX } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteAccount, getSession, signOut } from "@/lib/clinic-storage";

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? getSession() : null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setConfirmDelete(false);
      toast.success("Your account has been deleted.");
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete your account.");
    } finally {
      setDeleting(false);
    }
  };

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
            <DropdownMenuSeparator className="bg-border/70" />
            <DropdownMenuItem
              className="cursor-pointer gap-3 rounded-xl px-2.5 py-2.5 text-destructive focus:text-destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <UserX className="h-4 w-4" />
              </span>
              Delete account
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={(open) => !deleting && setConfirmDelete(open)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes your Bloom Clinic sign-in and every appointment saved to
              this account. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full" disabled={deleting}>
              Keep my account
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmDeleteAccount();
              }}
              disabled={deleting}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}
