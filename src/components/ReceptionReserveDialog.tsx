import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  DOCTORS,
  buildSlotStartIso,
  getFreeSlotsForDay,
  loadBookedIsosForDay,
  receptionCreateBooking,
} from "@/lib/reception-api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBooked: () => void;
};

export function ReceptionReserveDialog({ open, onOpenChange, onBooked }: Props) {
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [time, setTime] = useState<string | null>(null);
  const [bookedIsos, setBookedIsos] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [notes, setNotes] = useState("");

  const freeSlots = useMemo(() => {
    if (!doctorId || !date) return [];
    return getFreeSlotsForDay(doctorId, date, bookedIsos);
  }, [doctorId, date, bookedIsos]);

  useEffect(() => {
    if (!open) {
      setDoctorId("");
      setDate(new Date());
      setTime(null);
      setFirstName("");
      setLastName("");
      setAge("");
      setGender("female");
      setNotes("");
      setBookedIsos(new Set());
      return;
    }
    setDate(new Date());
    setTime(null);
  }, [open]);

  useEffect(() => {
    if (!open || !doctorId || !date) {
      setBookedIsos(new Set());
      return;
    }
    setLoadingSlots(true);
    void loadBookedIsosForDay(doctorId, date)
      .then(setBookedIsos)
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : "Failed to load availability"),
      )
      .finally(() => setLoadingSlots(false));
  }, [open, doctorId, date]);

  useEffect(() => {
    if (time && !freeSlots.some((s) => s.time === time)) {
      setTime(freeSlots[0]?.time ?? null);
    } else if (!time && freeSlots[0]) {
      setTime(freeSlots[0].time);
    }
  }, [freeSlots, time]);

  const isFriday = date?.getDay() === 5;
  const isPast = (d: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId) return toast.error("Select a doctor.");
    if (!date) return toast.error("Select a date.");
    if (isFriday) return toast.error("Fridays are closed.");
    if (!time) return toast.error("Pick an available time.");
    const ageNum = Number(age);
    if (!ageNum || ageNum <= 0 || ageNum > 150) return toast.error("Enter a valid age.");

    setSubmitting(true);
    try {
      await receptionCreateBooking({
        doctorId,
        slotStart: buildSlotStartIso(date, time),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age: ageNum,
        gender,
        notes,
      });
      toast.success("Appointment reserved.");
      onBooked();
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not reserve appointment");
      if (doctorId && date) {
        const next = await loadBookedIsosForDay(doctorId, date);
        setBookedIsos(next);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !submitting && onOpenChange(o)}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-3xl sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Reserve appointment</DialogTitle>
          <DialogDescription>
            Book a walk-in patient. Their details are stored on the reservation.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <section>
            <Label className="mb-2 block">Doctor</Label>
            <div className="grid grid-cols-2 gap-2">
              {DOCTORS.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => {
                    setDoctorId(d.id);
                    setTime(null);
                  }}
                  className={cn(
                    "rounded-2xl border border-border/70 p-3 text-left text-sm transition-all",
                    doctorId === d.id
                      ? "border-transparent bg-peach-gradient text-primary-foreground shadow-soft"
                      : "bg-card hover:border-primary/40",
                  )}
                >
                  <div className="font-medium">{d.name}</div>
                  <div
                    className={cn(
                      "text-xs",
                      doctorId === d.id ? "text-primary-foreground/90" : "text-muted-foreground",
                    )}
                  >
                    {d.specialty}
                  </div>
                </button>
              ))}
            </div>
          </section>

          {doctorId && (
            <>
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  <Label>Date</Label>
                </div>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-11 w-full justify-start rounded-2xl font-normal",
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
                      disabled={(d) => d.getDay() === 5 || isPast(d)}
                    />
                  </PopoverContent>
                </Popover>
              </section>

              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <Label>Time</Label>
                  {loadingSlots && (
                    <span className="text-xs text-muted-foreground">Loading…</span>
                  )}
                </div>
                {isFriday ? (
                  <p className="text-sm text-muted-foreground">Clinic is closed on Fridays.</p>
                ) : freeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No open slots on this date.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {freeSlots.map((s) => (
                      <button
                        key={s.iso}
                        type="button"
                        onClick={() => setTime(s.time)}
                        className={cn(
                          "rounded-xl border border-border/70 py-2 text-sm font-medium transition-all",
                          time === s.time
                            ? "border-transparent bg-peach-gradient text-primary-foreground shadow-soft"
                            : "bg-card hover:border-primary/40",
                        )}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          <section className="space-y-3 rounded-2xl border border-border/60 bg-card/50 p-4">
            <h4 className="font-display text-base">Patient details</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="r-fn">First name</Label>
                <Input
                  id="r-fn"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-ln">Last name</Label>
                <Input
                  id="r-ln"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="r-age">Age</Label>
                <Input
                  id="r-age"
                  type="number"
                  min={1}
                  max={150}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender</Label>
                <RadioGroup
                  value={gender}
                  onValueChange={(v) => setGender(v as typeof gender)}
                  className="flex gap-2"
                >
                  {(["female", "male", "other"] as const).map((g) => (
                    <label
                      key={g}
                      className={cn(
                        "flex flex-1 cursor-pointer items-center justify-center rounded-xl border border-border/70 px-2 py-2 text-xs capitalize",
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
              <Label htmlFor="r-notes">Notes (optional)</Label>
              <Textarea
                id="r-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="rounded-xl"
              />
            </div>
          </section>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-peach-gradient shadow-soft hover:opacity-95"
            >
              {submitting ? "Saving…" : "Confirm reservation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
