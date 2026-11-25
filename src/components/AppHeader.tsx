import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Menu, Stethoscope, X } from "lucide-react";
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
import { deleteAccount, getSession, signOut } from "@/lib/clinic-storage";
import { cn } from "@/lib/utils";

export function AppHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const session = typeof window !== "undefined" ? getSession() : null;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuMounted, setMenuMounted] = useState(false);
  const [drawerIn, setDrawerIn] = useState(false);

  const confirmSignOutNow = async () => {
    setSigningOut(true);
    try {
      await signOut();
      setConfirmSignOut(false);
      navigate({ to: "/auth" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign out.");
    } finally {
      setSigningOut(false);
    }
  };

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

  useEffect(() => {
    if (menuOpen) {
      setMenuMounted(true);
      return;
    }
    if (!menuMounted) return;
    const id = window.setTimeout(() => setMenuMounted(false), 280);
    return () => window.clearTimeout(id);
  }, [menuOpen, menuMounted]);

  useEffect(() => {
    if (!menuMounted || !menuOpen) {
      setDrawerIn(false);
      return;
    }
    const id = window.requestAnimationFrame(() => setDrawerIn(true));
    return () => window.cancelAnimationFrame(id);
  }, [menuMounted, menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth > 695) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [menuOpen]);

  if (pathname === "/" || pathname === "/auth") return null;

  const homeActive = pathname === "/doctors" || pathname.startsWith("/book");
  const visitsActive = pathname === "/appointments";
  const pastActive = pathname === "/past-visits";
  const itemClass =
    "inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-2">
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

        <nav className="ml-auto hidden min-[696px]:flex flex-wrap items-center gap-1">
          <Link
            to="/doctors"
            className={cn(itemClass, homeActive && "bg-accent text-foreground")}
          >
            Home
          </Link>
          <Link
            to="/appointments"
            className={cn(itemClass, visitsActive && "bg-accent text-foreground")}
          >
            My appointments
          </Link>
          <Link
            to="/past-visits"
            className={cn(itemClass, pastActive && "bg-accent text-foreground")}
          >
            Past appointments
          </Link>
          <button type="button" className={itemClass} onClick={() => setConfirmSignOut(true)}>
            Sign out
          </button>
          <button
            type="button"
            className={cn(itemClass, "text-destructive hover:bg-destructive/10 hover:text-destructive")}
            onClick={() => setConfirmDelete(true)}
          >
            Delete account
          </button>
        </nav>

        <button
          type="button"
          className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl min-[696px]:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          <Menu className="size-[26px] text-[#4E382E]" />
        </button>
      </div>

      {menuMounted
        ? createPortal(
          <div className="fixed inset-0 z-[1100]">
            <button
              type="button"
              className={cn(
                "absolute inset-0 bg-[rgba(40,24,18,0.45)] transition-opacity duration-[280ms]",
                drawerIn ? "opacity-100" : "opacity-0",
              )}
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className={cn(
                "absolute top-0 right-0 bottom-0 w-[300px] bg-[#4E382E] px-7 pt-[18px] pb-7 shadow-[-8px_0_18px_rgba(42,26,20,0.28)] transition-transform duration-[280ms] ease-out",
                drawerIn ? "translate-x-0" : "translate-x-full",
              )}
            >
              <div className="mb-7 flex justify-end">
                <button
                  type="button"
                  className="flex h-10 w-10 items-center justify-center"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="size-[26px] text-[#FFF8F4]" />
                </button>
              </div>
              <button
                type="button"
                className="w-full border-b border-[rgba(255,248,244,0.22)] py-5 text-left font-sans text-[22px] font-semibold text-[#FFF8F4]"
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ to: "/doctors" });
                }}
              >
                Home
              </button>
              <button
                type="button"
                className="w-full border-b border-[rgba(255,248,244,0.22)] py-5 text-left font-sans text-[22px] font-semibold text-[#FFF8F4]"
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ to: "/appointments" });
                }}
              >
                My appointments
              </button>
              <button
                type="button"
                className="w-full border-b border-[rgba(255,248,244,0.22)] py-5 text-left font-sans text-[22px] font-semibold text-[#FFF8F4]"
                onClick={() => {
                  setMenuOpen(false);
                  navigate({ to: "/past-visits" });
                }}
              >
                Past appointments
              </button>
              <button
                type="button"
                className="w-full border-b border-[rgba(255,248,244,0.22)] py-5 text-left font-sans text-[22px] font-semibold text-[#FFF8F4]"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmSignOut(true);
                }}
              >
                Sign out
              </button>
              <button
                type="button"
                className="w-full py-5 text-left font-sans text-[22px] font-semibold text-[#F3B2A8]"
                onClick={() => {
                  setMenuOpen(false);
                  setConfirmDelete(true);
                }}
              >
                Delete account
              </button>
            </div>
          </div>,
          document.body,
        )
        : null}

      <AlertDialog open={confirmSignOut} onOpenChange={(open) => !signingOut && setConfirmSignOut(open)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Do you want to sign out?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-full hover:bg-background hover:text-foreground"
              disabled={signingOut}
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void confirmSignOutNow();
              }}
              disabled={signingOut}
              className="rounded-full bg-peach-gradient text-primary-foreground shadow-soft hover:opacity-95"
            >
              {signingOut ? "Signing out…" : "Yes"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
