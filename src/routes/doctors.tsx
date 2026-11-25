import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Baby, ChevronRight, HeartPulse, ScanFace, Stethoscope, type LucideIcon } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { DOCTORS, ensureAuthReady, getSession } from "@/lib/clinic-storage";
import { isReceptionStaff } from "@/lib/reception-api";

export const Route = createFileRoute("/doctors")({
  head: () => ({
    meta: [
      { title: "Choose your doctor — Bloom Clinic" },
      { name: "description", content: "Pick a doctor to book a 15-minute appointment at Bloom Clinic." },
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
  component: DoctorsPage,
});

const specialtyIcons: Record<string, LucideIcon> = {
  "General Medicine": Stethoscope,
  Dermatology: ScanFace,
  Pediatrics: Baby,
  Cardiology: HeartPulse,
};

function DoctorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl">Choose your doctor</h1>
          <p className="mt-2 text-muted-foreground">
            Pick the specialist that fits you.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {DOCTORS.map((d) => {
            const Icon = specialtyIcons[d.specialty] ?? Stethoscope;
            return (
              <Link
              key={d.id}
              to="/book/$doctorId"
              params={{ doctorId: d.id }}
              className="group relative overflow-hidden rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-soft ${d.color}`}
                >
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-lg leading-tight">{d.name}</h3>
                  <p className="text-sm font-medium text-primary">{d.specialty}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{d.bio}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
              </Link>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
