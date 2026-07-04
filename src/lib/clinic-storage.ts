// Local (browser-only) demo storage for the clinic app.
// No backend — everything lives in localStorage.

export type User = { email: string; name: string };
export type Doctor = {
  id: string;
  name: string;
  specialty: string;
  bio: string;
  color: string; // avatar bg utility class
  initials: string;
};

export type Appointment = {
  id: string;
  userEmail: string;
  doctorId: string;
  doctorName: string;
  specialty: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  firstName: string;
  lastName: string;
  age: number;
  gender: "male" | "female" | "other";
  notes: string;
  createdAt: string;
};

const USERS_KEY = "clinic.users";
const SESSION_KEY = "clinic.session";
const APPTS_KEY = "clinic.appointments";

export const DOCTORS: Doctor[] = [
  {
    id: "amina-hassan",
    name: "Dr. Amina Hassan",
    specialty: "General Medicine",
    bio: "Family care and everyday health checkups.",
    color: "bg-peach",
    initials: "AH",
  },
  {
    id: "omar-khalil",
    name: "Dr. Omar Khalil",
    specialty: "Dermatology",
    bio: "Skin, hair, and cosmetic consultations.",
    color: "bg-sage",
    initials: "OK",
  },
  {
    id: "layla-nasser",
    name: "Dr. Layla Nasser",
    specialty: "Pediatrics",
    bio: "Gentle care for infants, kids, and teens.",
    color: "bg-accent",
    initials: "LN",
  },
  {
    id: "yusuf-mansour",
    name: "Dr. Yusuf Mansour",
    specialty: "Cardiology",
    bio: "Heart health screenings and follow-ups.",
    color: "bg-primary",
    initials: "YM",
  },
];

export function getDoctor(id: string) {
  return DOCTORS.find((d) => d.id === id);
}

// Time slots: 9:00 → 16:45, every 15 min
export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h < 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

// ---------- auth (demo) ----------
type StoredUser = User & { password: string };

function readUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function signUp(name: string, email: string, password: string): User {
  const users = readUsers();
  if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
    throw new Error("An account with this email already exists.");
  }
  const user: StoredUser = { name, email, password };
  users.push(user);
  writeUsers(users);
  const session: User = { name, email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signIn(email: string, password: string): User {
  const users = readUsers();
  const found = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
  );
  if (!found) throw new Error("Invalid email or password.");
  const session: User = { name: found.name, email: found.email };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSession(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

// ---------- appointments ----------
export function getAppointments(userEmail?: string): Appointment[] {
  if (typeof window === "undefined") return [];
  try {
    const all: Appointment[] = JSON.parse(localStorage.getItem(APPTS_KEY) || "[]");
    return userEmail ? all.filter((a) => a.userEmail === userEmail) : all;
  } catch {
    return [];
  }
}

export function addAppointment(appt: Omit<Appointment, "id" | "createdAt">): Appointment {
  const all = getAppointments();
  const full: Appointment = {
    ...appt,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  all.push(full);
  localStorage.setItem(APPTS_KEY, JSON.stringify(all));
  return full;
}

export function cancelAppointment(id: string) {
  const all = getAppointments();
  const next = all.filter((a) => a.id !== id);
  localStorage.setItem(APPTS_KEY, JSON.stringify(next));
}

export function isSlotTaken(doctorId: string, date: string, time: string): boolean {
  return getAppointments().some(
    (a) => a.doctorId === doctorId && a.date === date && a.time === time,
  );
}
