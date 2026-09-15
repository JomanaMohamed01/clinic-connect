import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { format, isSameDay } from "date-fns";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LogOut,
  Stethoscope,
  Trash2,
  User,
} from "lucide-react";
import { toast } from "sonner";
import { ReceptionReserveDialog } from "@/components/ReceptionReserveDialog";
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
import { Button } from "@/components/ui/button";
import { formatTime12h } from "@/lib/format-time";
import { ensureAuthReady } from "@/lib/clinic-storage";
import {
  type ReceptionBooking,
  formatReceptionDayLabel,
  getReceptionBookingsForDay,
  isReceptionStaff,
  receptionCancelBooking,
  receptionSignOut,
} from "@/lib/reception-api";

export const Route = createFileRoute("/reception")({
  head: () => ({
    meta: [
      { title: "Reception desk — Bloom Clinic" },
      { name: "description", content: "Reception counter for reserving clinic appointments." },
    ],
  }),
  beforeLoad: async () => {
    if (typeof window !== "undefined") {
      await ensureAuthReady();
      if (!(await isReceptionStaff())) {
        throw redirect({ to: "/auth" });
      }
    }
  },
  component: ReceptionPage,
});

function ReceptionPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookings, setBookings] = useState<ReceptionBooking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [pendingCancel, setPendingCancel] = useState<string | null>(null);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      setBookings(await getReceptionBookingsForDay(selectedDate));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load reservations");
      setBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleSignOut = async () => {
    await receptionSignOut();
    navigate({ to: "/auth" });
  };

  const confirmCancel = async () => {
    if (!pendingCancel) return;
    try {
      await receptionCancelBooking(pendingCancel);
      setPendingCancel(null);
      toast.success("Reservation cancelled");
      await loadBookings();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not cancel");
    }
  };

  const goPrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d);
  };

  const goNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d);
  };

  const goToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
  };

  const isToday = isSameDay(selectedDate, new Date());

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-peach-gradient text-primary-foreground shadow-soft">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <div className="font-display text-lg leading-none">Bloom Clinic</div>
              <div className="text-xs text-muted-foreground">Reception desk</div>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full" onClick={() => void handleSignOut()}>
            <LogOut className="mr-1.5 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl">
              {isToday ? "Today's reservations" : "Reservations"}
            </h1>
            <p className="mt-1 text-muted-foreground">{formatReceptionDayLabel(selectedDate)}</p>
          </div>
          <Button
            onClick={() => setReserveOpen(true)}
            className="h-11 rounded-full bg-peach-gradient shadow-soft hover:opacity-95"
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Reserve appointment
          </Button>
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={goPrevDay}>
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            {!isToday && (
              <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={goToday}>
                Today
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={goNextDay}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {loadingBookings
              ? "Loading…"
              : `${bookings.length} reservation${bookings.length === 1 ? "" : "s"}`}
          </p>
        </div>

        {loadingBookings ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Loading reservations…
          </div>
        ) : bookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h3 className="font-display text-xl">No reservations</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Nothing booked for {format(selectedDate, "MMMM d")} yet.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {bookings.map((b) => {
              const slot = new Date(b.slotStart);
              const patientName = [b.firstName, b.lastName].filter(Boolean).join(" ") || "Walk-in";
              return (
                <li
                  key={b.id}
                  className="overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft"
                >
                  <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 p-5 max-[430px]:grid-cols-[auto_1fr]">
                    <div className="flex min-w-[84px] shrink-0 flex-col items-center justify-center rounded-2xl bg-peach-gradient px-4 py-3 text-center text-primary-foreground">
                      <div className="text-xs uppercase tracking-widest opacity-90">
                        {format(slot, "MMM")}
                      </div>
                      <div className="font-display text-2xl leading-none">{formatTime12h(slot)}</div>
                    </div>

                    <div className="min-w-0 max-[430px]:col-span-2 max-[430px]:col-start-1 max-[430px]:row-start-2">
                      <h3 className="font-display text-lg leading-tight">{b.doctorName}</h3>
                      <p className="text-sm text-primary">{patientName}</p>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {b.age != null && b.age > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" /> {b.age} years
                          </span>
                        )}
                        {b.gender && <span className="capitalize">{b.gender}</span>}
                      </div>
                      {b.notes && (
                        <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                          “{b.notes}”
                        </p>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPendingCancel(b.id)}
                      className="shrink-0 justify-self-end rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive max-[430px]:col-start-2 max-[430px]:row-start-1"
                    >
                      <Trash2 className="mr-1.5 h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      <ReceptionReserveDialog
        open={reserveOpen}
        onOpenChange={setReserveOpen}
        onBooked={() => void loadBookings()}
      />

      <AlertDialog open={!!pendingCancel} onOpenChange={(o) => !o && setPendingCancel(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this reservation?</AlertDialogTitle>
            <AlertDialogDescription>
              The time slot will become available for other patients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmCancel()}
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
