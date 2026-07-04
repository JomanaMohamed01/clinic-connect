import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarPlus, Clock, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  type Appointment,
  cancelAppointment,
  ensureAuthReady,
  getAppointments,
  getSession,
} from "@/lib/clinic-storage";
import { isReceptionStaff } from "@/lib/reception-api";

export const Route = createFileRoute("/appointments")({
  head: () => ({
    meta: [
      { title: "My appointments — Bloom Clinic" },
      { name: "description", content: "View and manage your upcoming clinic visits." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      await ensureAuthReady();
      if (!getSession()) {
        throw redirect({ to: "/auth" });
      }
      if (await isReceptionStaff()) {
        throw redirect({ to: "/reception" });
      }
    }
  },
  component: AppointmentsPage,
});

function AppointmentsPage() {
  const navigate = useNavigate();
  const session = getSession();
  const [items, setItems] = useState<Appointment[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void getAppointments(session.email)
      .then(setItems)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load appointments"));
  }, [session?.email]);

  const sorted = [...items].sort((a, b) =>
    (a.date + a.time).localeCompare(b.date + b.time),
  );

  const confirmCancel = async () => {
    if (!pending) return;
    try {
      await cancelAppointment(pending);
      setItems(session ? await getAppointments(session.email) : []);
      setPending(null);
      toast.success("Appointment cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel appointment");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">My appointments</h1>
            <p className="mt-1 text-muted-foreground">
              {sorted.length
                ? `You have ${sorted.length} upcoming visit${sorted.length > 1 ? "s" : ""}.`
                : "No appointments yet."}
            </p>
          </div>
          <Button
            onClick={() => navigate({ to: "/doctors" })}
            className="h-11 rounded-full bg-peach-gradient shadow-soft hover:opacity-95"
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Book new
          </Button>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
              <CalendarPlus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-xl">Nothing booked yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Reserve your first 15-minute visit with one of our doctors.
            </p>
            <Link
              to="/doctors"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-peach-gradient px-6 text-sm font-medium text-primary-foreground shadow-soft"
            >
              Choose a doctor
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((a) => (
              <li
                key={a.id}
                className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft"
              >
                <div className="flex flex-wrap items-start gap-4 p-5">
                  <div className="flex min-w-[84px] flex-col items-center justify-center rounded-2xl bg-peach-gradient px-4 py-3 text-center text-primary-foreground">
                    <div className="text-xs uppercase tracking-widest opacity-90">
                      {format(parseISO(a.date), "MMM")}
                    </div>
                    <div className="font-display text-3xl leading-none">
                      {format(parseISO(a.date), "d")}
                    </div>
                    <div className="mt-1 text-xs opacity-90">
                      {format(parseISO(a.date), "EEE")}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg leading-tight">{a.doctorName}</h3>
                    <p className="text-sm text-primary">{a.specialty}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> {a.time} · 15 min
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5" /> {a.firstName} {a.lastName}, {a.age}
                      </span>
                    </div>
                    {a.notes && (
                      <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                        “{a.notes}”
                      </p>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPending(a.id)}
                    className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              This can’t be undone. The time slot will free up for another patient.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancel}
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
