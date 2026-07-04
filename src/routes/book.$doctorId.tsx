import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import {
  addAppointment,
  ensureAuthReady,
  generateTimeSlots,
  getDoctor,
  getSession,
  isSlotTaken,
  refreshDoctorBookings,
} from "@/lib/clinic-storage";

export const Route = createFileRoute("/book/$doctorId")({
  head: () => ({
    meta: [
      { title: "Book an appointment — Bloom Clinic" },
      { name: "description", content: "Pick a time and date, then confirm your 15-minute visit." },
    ],
  }),
  beforeLoad: async ({ params }) => {
    if (typeof window !== "undefined") {
      await ensureAuthReady();
      if (!getSession()) {
        throw redirect({ to: "/auth" });
      }
    }
    if (!getDoctor(params.doctorId)) {
      throw redirect({ to: "/doctors" });
    }
  },
  component: BookPage,
});

function BookPage() {
  const { doctorId } = Route.useParams();
  const navigate = useNavigate();
  const doctor = getDoctor(doctorId)!;

  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [, setBookingsTick] = useState(0);

  const slots = useMemo(() => generateTimeSlots(doctorId), [doctorId]);
  const dateStr = date ? format(date, "yyyy-MM-dd") : null;

  useEffect(() => {
    void refreshDoctorBookings(doctorId)
      .then(() => setBookingsTick((n) => n + 1))
      .catch((err) => toast.error(err instanceof Error ? err.message : "Failed to load availability"));
  }, [doctorId]);

  const isFriday = (d: Date) => d.getDay() === 5;
  const isPast = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = getSession();
    if (!session) return navigate({ to: "/auth" });
    if (!time) return toast.error("Please pick a time.");
    if (!date || !dateStr) return toast.error("Please pick a date.");
    if (isFriday(date)) return toast.error("Fridays are closed — please pick another day.");
    const ageNum = Number(age);
    if (!ageNum || ageNum <= 0 || ageNum > 120) return toast.error("Please enter a valid age.");
    if (isSlotTaken(doctorId, dateStr, time)) {
      return toast.error("That slot was just taken. Please pick another time.");
    }

    setSubmitting(true);
    try {
      await addAppointment({
        userEmail: session.email,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        date: dateStr,
        time,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: ageNum,
        gender,
        notes: notes.trim(),
      });

      toast.success("Appointment confirmed!");
      navigate({ to: "/appointments" });
    } catch (err) {
      await refreshDoctorBookings(doctorId);
      setBookingsTick((n) => n + 1);
      toast.error(err instanceof Error ? err.message : "Could not book appointment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 py-8">
        <Link
          to="/doctors"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Choose a different doctor
        </Link>

        {/* Doctor header */}
        <div className="mb-8 flex items-center gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl font-display text-lg text-primary-foreground ${doctor.color}`}
          >
            {doctor.initials}
          </div>
          <div>
            <h2 className="font-display text-xl">{doctor.name}</h2>
            <p className="text-sm text-primary">{doctor.specialty}</p>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-8">
          {/* Time */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg">Pick a time</h3>
              <span className="text-xs text-muted-foreground">(15 min each)</span>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {slots.map((s) => {
                const taken = dateStr ? isSlotTaken(doctorId, dateStr, s) : false;
                const active = time === s;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={taken}
                    onClick={() => setTime(s)}
                    className={cn(
                      "rounded-xl border border-border/70 py-2 text-sm font-medium transition-all",
                      active
                        ? "border-transparent bg-peach-gradient text-primary-foreground shadow-soft"
                        : "bg-card hover:border-primary/40 hover:bg-accent/50",
                      taken && "cursor-not-allowed opacity-40 line-through",
                    )}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Date */}
          <section>
            <div className="mb-3 flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-primary" />
              <h3 className="font-display text-lg">Pick a date</h3>
              <span className="text-xs text-muted-foreground">(Fridays closed)</span>
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-12 w-full justify-start rounded-2xl text-left font-normal",
                    !date && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "EEEE, MMMM d, yyyy") : "Choose a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  disabled={(d) => isFriday(d) || isPast(d)}
                  className={cn("pointer-events-auto p-3")}
                />
              </PopoverContent>
            </Popover>
          </section>

          {/* Patient details */}
          <section className="space-y-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft">
            <h3 className="font-display text-lg">Your details</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="fn">First name</Label>
                <Input
                  id="fn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ln">Last name</Label>
                <Input
                  id="ln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  min={1}
                  max={120}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(v) => setGender(v as typeof gender)}
                  className="flex gap-2 pt-1"
                >
                  {(["female", "male", "other"] as const).map((g) => (
                    <label
                      key={g}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-border/70 px-3 py-2 text-sm capitalize transition-colors",
                        gender === g
                          ? "border-transparent bg-peach-gradient text-primary-foreground"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <RadioGroupItem value={g} className="sr-only" />
                      {g}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything the doctor should know?"
                rows={3}
                className="rounded-xl"
              />
            </div>
          </section>

          <Button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-full bg-peach-gradient text-base shadow-soft hover:opacity-95"
          >
            <Check className="mr-2 h-4 w-4" />
            Confirm reservation
          </Button>
        </form>
      </main>
    </div>
  );
}
