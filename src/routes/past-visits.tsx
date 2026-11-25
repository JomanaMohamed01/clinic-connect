import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Clock, History, User } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import {
  type Appointment,
  ensureAuthReady,
  getAppointments,
  getSession,
} from "@/lib/clinic-storage";
import { formatSlotLabel, isPastVisit } from "@/lib/format-time";
import { isReceptionStaff } from "@/lib/reception-api";

export const Route = createFileRoute("/past-visits")({
  head: () => ({
    meta: [
      { title: "Past appointments — Bloom Clinic" },
      { name: "description", content: "See the clinic appointments you have already completed." },
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
  component: PastVisitsPage,
});

function PastVisitsPage() {
  const session = getSession();
  const [items, setItems] = useState<Appointment[]>([]);

  useEffect(() => {
    if (!session) return;
    void getAppointments(session.email)
      .then(setItems)
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load past appointments"));
  }, [session?.email]);

  const sorted = items
    .filter((a) => isPastVisit(a.date, a.time))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-5 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-3xl sm:text-4xl">Past appointments</h1>
        </div>

        {sorted.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent">
              <History className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-display text-xl">No past appointments yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Appointments show up here after their time has passed.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {sorted.map((a) => (
              <li
                key={a.id}
                className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft"
              >
                <div className="flex items-start gap-3 p-4 sm:gap-4 sm:p-5">
                  <div className="flex w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-2xl bg-peach-gradient px-2 py-3 text-center text-primary-foreground sm:w-[5.25rem] sm:px-4">
                    <div className="text-[0.7rem] uppercase tracking-widest opacity-90">
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
                    <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span>{formatSlotLabel(a.time)} · 30 min</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="break-words">
                          {a.firstName} {a.lastName},{" "}
                          <span className="whitespace-nowrap">
                            {a.age} {a.age === 1 ? "year" : "years"}
                          </span>
                        </span>
                      </span>
                    </div>
                    {a.notes && (
                      <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                        “{a.notes}”
                      </p>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
