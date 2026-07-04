import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import {
  DOCTOR_HOURS,
  DOCTORS,
  SLOT_MINUTES,
  ensureAuthReady,
  getSession,
  signIn,
  signOut,
} from "@/lib/clinic-storage";

export const RECEPTION_EMAIL = "reception@reserve.com";
export const RECEPTION_PASSWORD = "123456";
const LEGACY_RECEPTION_PASSWORD = "12345";

export type ReceptionBooking = {
  id: string;
  slotStart: string;
  doctorName: string;
  firstName: string | null;
  lastName: string | null;
  age: number | null;
  gender: string | null;
  notes: string | null;
};

export function isReceptionEmail(email: string | undefined | null): boolean {
  return email?.trim().toLowerCase() === RECEPTION_EMAIL;
}

export async function isReceptionStaff(): Promise<boolean> {
  await ensureAuthReady();
  const session = getSession();
  if (!session) return false;
  if (isReceptionEmail(session.email)) return true;

  const { data, error } = await supabase.rpc("is_reception_user");
  if (error) {
    console.warn("is_reception_user RPC failed:", error.message);
    return isReceptionEmail(session.email);
  }
  return Boolean(data);
}

async function ensureReceptionAccount(password: string): Promise<void> {
  const { data, error } = await supabase.auth.signUp({
    email: RECEPTION_EMAIL,
    password,
    options: {
      data: { role: "reception", name: "Reception Desk", full_name: "Reception Desk" },
    },
  });

  if (error && error.code !== "user_already_exists" && error.code !== "email_exists") {
    throw new Error(error.message);
  }

  if (data.session) return;

  await signIn(RECEPTION_EMAIL, password);
}

export async function receptionSignIn(email: string, password: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  if (normalized !== RECEPTION_EMAIL) {
    throw new Error("This page is for reception staff only.");
  }

  try {
    await signIn(RECEPTION_EMAIL, password);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    const invalidCreds =
      message.includes("Invalid email") || message.includes("Sign in failed");

    if (invalidCreds && password === RECEPTION_PASSWORD) {
      try {
        await signIn(RECEPTION_EMAIL, LEGACY_RECEPTION_PASSWORD);
        const { error: updateError } = await supabase.auth.updateUser({
          password: RECEPTION_PASSWORD,
        });
        if (updateError) throw updateError;
      } catch {
        await ensureReceptionAccount(password);
      }
    } else if (invalidCreds) {
      await ensureReceptionAccount(password);
    } else {
      throw err;
    }
  }

  if (!isReceptionEmail(getSession()?.email)) {
    await signOut();
    throw new Error("Staff access only.");
  }
}

export async function receptionSignOut(): Promise<void> {
  await signOut();
}

export async function getReceptionBookingsForDay(day: Date): Promise<ReceptionBooking[]> {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      slot_start,
      first_name,
      last_name,
      age,
      gender,
      notes,
      doctors (name)
    `,
    )
    .gte("slot_start", dayStart.toISOString())
    .lt("slot_start", dayEnd.toISOString())
    .order("slot_start", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const doctors = row.doctors as { name: string } | { name: string }[] | null;
    const doctorName = Array.isArray(doctors) ? doctors[0]?.name : doctors?.name;
    return {
      id: row.id as string,
      slotStart: row.slot_start as string,
      doctorName: doctorName ?? "Doctor",
      firstName: row.first_name as string | null,
      lastName: row.last_name as string | null,
      age: row.age as number | null,
      gender: row.gender as string | null,
      notes: row.notes as string | null,
    };
  });
}

export async function receptionCreateBooking(input: {
  doctorId: string;
  slotStart: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: string;
  notes: string;
}): Promise<void> {
  const { error } = await supabase.rpc("reception_create_booking", {
    p_doctor_id: input.doctorId,
    p_slot_start: input.slotStart,
    p_first_name: input.firstName,
    p_last_name: input.lastName,
    p_age: input.age,
    p_gender: input.gender,
    p_notes: input.notes.trim() || null,
  });

  if (error) {
    if (error.code === "23505") {
      throw new Error("That time slot was just taken. Choose another time.");
    }
    if (/reception_create_booking|could not find|PGRST202|Forbidden/i.test(error.message ?? "")) {
      throw new Error(
        "Reception booking is not set up yet. Run sql/reception_staff.sql in the Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }
}

export async function receptionCancelBooking(bookingId: string): Promise<void> {
  const { error } = await supabase.rpc("reception_cancel_booking", { booking_id: bookingId });
  if (error) {
    if (/reception_cancel_booking|could not find|PGRST202|Forbidden/i.test(error.message ?? "")) {
      throw new Error(
        "Reception cancel is not set up yet. Run sql/reception_staff.sql in the Supabase SQL Editor.",
      );
    }
    throw new Error(error.message);
  }
}

export function buildSlotStartIso(date: Date, time: string): string {
  const [h, min] = time.split(":").map(Number);
  const slot = new Date(date);
  slot.setHours(h, min, 0, 0);
  return slot.toISOString();
}

export function getFreeSlotsForDay(
  doctorId: string,
  day: Date,
  bookedIsos: Set<string>,
): { iso: string; time: string }[] {
  if (day.getDay() === 5) return [];

  const hours = DOCTOR_HOURS[doctorId] ?? { startHour: 9, endHour: 17 };
  const now = new Date();
  const slots: { iso: string; time: string }[] = [];

  for (let h = hours.startHour; h < hours.endHour; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      const slot = new Date(day);
      slot.setHours(h, m, 0, 0);
      if (slot <= now) continue;
      const iso = slot.toISOString();
      if (!bookedIsos.has(iso)) {
        slots.push({
          iso,
          time: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        });
      }
    }
  }

  return slots;
}

export async function loadBookedIsosForDay(doctorId: string, day: Date): Promise<Set<string>> {
  const dayStart = new Date(day);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const { data, error } = await supabase
    .from("bookings")
    .select("slot_start")
    .eq("doctor_id", doctorId)
    .gte("slot_start", dayStart.toISOString())
    .lt("slot_start", dayEnd.toISOString());

  if (error) throw new Error(error.message);

  const set = new Set<string>();
  for (const row of data ?? []) {
    set.add(new Date(row.slot_start as string).toISOString());
  }
  return set;
}

export function formatReceptionDayLabel(day: Date): string {
  return format(day, "EEEE, MMMM d, yyyy");
}

export { DOCTORS };
