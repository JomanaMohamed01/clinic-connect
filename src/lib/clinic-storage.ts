import { format } from "date-fns";
import { supabase, type BookingRow } from "@/lib/supabase";

export type User = { email: string; name: string };
export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  color: string;
  initials: string;
};

export type Appointment = {
  id: string;
  userEmail: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: "male" | "female" | "other";
  notes: string;
  createdAt: string;
};

/** Per-doctor clinic hours (aligned with clinic-supabase-project). */
export const DOCTOR_HOURS: Record<string, { startHour: number; endHour: number }> = {
  "11111111-1111-1111-1111-111111111111": { startHour: 9, endHour: 15 },
  "22222222-2222-2222-2222-222222222222": { startHour: 10, endHour: 18 },
  "33333333-3333-3333-3333-333333333333": { startHour: 8, endHour: 14 },
  "44444444-4444-4444-4444-444444444444": { startHour: 12, endHour: 20 },
};

export const SLOT_MINUTES = 15;
export const MAX_UPCOMING_APPOINTMENTS = 3;

export const DOCTORS: Doctor[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    name: "Dr. Salma",
    specialty: "General Medicine",
    bio: "Family care and everyday health checkups.",
    color: "bg-peach",
    initials: "SA",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Dr. Ahmed",
    specialty: "Dermatology",
    bio: "Skin, hair, and cosmetic consultations.",
    color: "bg-sage",
    initials: "AH",
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "Dr. Sara",
    specialty: "Pediatrics",
    bio: "Gentle care for infants, kids, and teens.",
    color: "bg-accent",
    initials: "SR",
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    name: "Dr. Ali",
    specialty: "Cardiology",
    bio: "Heart health screenings and follow-ups.",
    color: "bg-primary",
    initials: "AL",
  },
];

let cachedSession: User | null = null;
let cachedUserId: string | null = null;
let bookingsCache: BookingRow[] = [];
let authReadyPromise: Promise<void> | null = null;

function displayNameFromSession(email: string, metadata?: Record<string, unknown>): string {
  const name =
    (typeof metadata?.name === "string" && metadata.name) ||
    (typeof metadata?.full_name === "string" && metadata.full_name) ||
    email.split("@")[0];
  return name;
}

function updateCacheFromSession(
  session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null,
) {
  if (!session?.user?.email) {
    cachedSession = null;
    cachedUserId = null;
    return;
  }
  cachedUserId = session.user.id;
  cachedSession = {
    email: session.user.email,
    name: displayNameFromSession(session.user.email, session.user.user_metadata),
  };
}

export function getSession(): User | null {
  return cachedSession;
}

export function getUserId(): string | null {
  return cachedUserId;
}

export async function ensureAuthReady(): Promise<void> {
  if (typeof window === "undefined") return;
  if (!authReadyPromise) {
    authReadyPromise = initClinicAuth();
  }
  await authReadyPromise;
}

async function initClinicAuth(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  updateCacheFromSession(session);

  supabase.auth.onAuthStateChange((_event, session) => {
    updateCacheFromSession(session);
  });
}

export function getDoctor(id: string) {
  return DOCTORS.find((d) => d.id === id);
}

export function generateTimeSlots(doctorId: string): string[] {
  const hours = DOCTOR_HOURS[doctorId] ?? { startHour: 9, endHour: 17 };
  const slots: string[] = [];
  for (let h = hours.startHour; h < hours.endHour; h++) {
    for (let m = 0; m < 60; m += SLOT_MINUTES) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

function buildSlotStart(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

function slotIso(date: string, time: string): string {
  return buildSlotStart(date, time).toISOString();
}

function normalizeGender(gender: string | null): Appointment["gender"] {
  const value = (gender ?? "").toLowerCase();
  if (value === "male" || value === "female" || value === "other") return value;
  if (value === "m") return "male";
  if (value === "f") return "female";
  return "other";
}

function rowToAppointment(row: BookingRow): Appointment {
  const slot = new Date(row.slot_start);
  const doctor = getDoctor(row.doctor_id);
  return {
    id: row.id,
    userEmail: cachedSession?.email ?? "",
    doctorId: row.doctor_id,
    doctorName: doctor?.name ?? "Doctor",
    specialty: doctor?.specialty ?? "",
    date: format(slot, "yyyy-MM-dd"),
    time: format(slot, "HH:mm"),
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    age: row.age ?? 0,
    gender: normalizeGender(row.gender),
    notes: row.notes ?? "",
    createdAt: row.created_at,
  };
}

function getAuthErrorMessage(error: { code?: string; message?: string }, isSignUp: boolean): string {
  const code = error.code;
  const msg = error.message ?? "";

  if (isSignUp) {
    switch (code) {
      case "user_already_exists":
      case "email_exists":
        return "An account with this email already exists.";
      case "weak_password":
        return msg || "Password is too weak. Use at least 6 characters.";
      default:
        return msg || "Sign up failed. Please try again.";
    }
  }

  switch (code) {
    case "invalid_credentials":
      return "Invalid email or password.";
    case "email_not_confirmed":
      return "Please confirm your email before signing in.";
    default:
      return msg || "Sign in failed. Please try again.";
  }
}

// ---------- auth ----------
export async function signUp(name: string, email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { name: name.trim(), full_name: name.trim() } },
  });

  if (error) throw new Error(getAuthErrorMessage(error, true));
  if (!data.user?.email) throw new Error("Sign up failed. Please try again.");

  if (data.session) {
    updateCacheFromSession(data.session);
    return cachedSession!;
  }

  throw new Error("Account created. Check your email to confirm, then sign in.");
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) throw new Error(getAuthErrorMessage(error, false));
  if (!data.session) throw new Error("Sign in failed. Please try again.");

  updateCacheFromSession(data.session);
  return cachedSession!;
}

export async function signOut() {
  await supabase.auth.signOut();
  cachedSession = null;
  cachedUserId = null;
  bookingsCache = [];
}

// ---------- appointments ----------
export async function refreshDoctorBookings(doctorId: string): Promise<void> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, patient_id, doctor_id, slot_start, first_name, last_name, age, gender, notes, created_at",
    )
    .eq("doctor_id", doctorId)
    .order("slot_start", { ascending: true });

  if (error) throw new Error(error.message);
  bookingsCache = (data as BookingRow[]) ?? [];
}

export function isSlotTaken(doctorId: string, date: string, time: string): boolean {
  const target = slotIso(date, time);
  return bookingsCache.some(
    (b) => b.doctor_id === doctorId && new Date(b.slot_start).toISOString() === target,
  );
}

export async function getAppointments(_userEmail?: string): Promise<Appointment[]> {
  const uid = cachedUserId;
  if (!uid) return [];

  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, patient_id, doctor_id, slot_start, first_name, last_name, age, gender, notes, created_at",
    )
    .eq("patient_id", uid)
    .order("slot_start", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data as BookingRow[]) ?? []).map(rowToAppointment);
}

export async function addAppointment(
  appt: Omit<Appointment, "id" | "createdAt">,
): Promise<Appointment> {
  const uid = cachedUserId;
  if (!uid) throw new Error("You must be signed in to book.");

  const nowIso = new Date().toISOString();
  const { data: existing, error: countError } = await supabase
    .from("bookings")
    .select("id, slot_start")
    .eq("patient_id", uid)
    .gt("slot_start", nowIso);

  if (countError) throw new Error(countError.message);
  if ((existing?.length ?? 0) >= MAX_UPCOMING_APPOINTMENTS) {
    throw new Error("You can have at most 3 upcoming appointments.");
  }

  const slotStart = slotIso(appt.date, appt.time);
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      patient_id: uid,
      doctor_id: appt.doctorId,
      slot_start: slotStart,
      first_name: appt.firstName,
      last_name: appt.lastName,
      age: appt.age,
      gender: appt.gender,
      notes: appt.notes.trim() || null,
    })
    .select(
      "id, patient_id, doctor_id, slot_start, first_name, last_name, age, gender, notes, created_at",
    )
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("That slot was just taken. Please pick another time.");
    }
    throw new Error(error.message);
  }

  const row = data as BookingRow;
  bookingsCache = [...bookingsCache, row];
  return rowToAppointment(row);
}

export async function cancelAppointment(id: string) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw new Error(error.message);
  bookingsCache = bookingsCache.filter((b) => b.id !== id);
}
