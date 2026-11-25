import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ensureAuthReady, getSession } from "@/lib/clinic-storage";
import { isReceptionStaff } from "@/lib/reception-api";
import { doctorsInSpecialty, getSpecialty } from "@/lib/specialties";

export const Route = createFileRoute("/doctors/$specialty")({
  head: () => ({
    meta: [
      { title: "Choose your doctor — Bloom Clinic" },
      { name: "description", content: "Choose a doctor in this specialization at Bloom Clinic." },
    ],
  }),
  beforeLoad: async ({ params }) => {
    if (!getSpecialty(params.specialty)) {
      throw redirect({ to: "/doctors" });
    }
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
  component: SpecialtyDoctorsPage,
});

function SpecialtyDoctorsPage() {
  const { specialty: slug } = Route.useParams();
  const specialty = getSpecialty(slug)!;
  const doctors = doctorsInSpecialty(specialty.name);
  const Icon = specialty.icon;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <Link
          to="/doctors"
          className="group mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="underline-offset-4 group-hover:underline">All specializations</span>
        </Link>

        <div className="mb-8 flex items-center gap-4">
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-soft ${specialty.color}`}
          >
            <Icon className="h-7 w-7" aria-hidden="true" />
          </div>
          <div>
            <h1 className="font-display text-4xl">{specialty.name}</h1>
            <p className="mt-1 text-muted-foreground">Choose your doctor.</p>
          </div>
        </div>

        {doctors.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border/70 bg-card/50 p-10 text-center">
            <h2 className="font-display text-xl">No doctors in this specialization yet</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose another specialization to see who is available.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {doctors.map((doctor) => (
              <Link
                key={doctor.id}
                to="/book/$doctorId"
                params={{ doctorId: doctor.id }}
                className="group flex items-start gap-4 rounded-3xl border border-border/60 bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
              >
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-soft ${doctor.color}`}
                >
                  <Icon className="h-7 w-7" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-display text-lg leading-tight">{doctor.name}</h2>
                  <p className="text-sm font-medium text-primary">{doctor.specialty}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{doctor.bio}</p>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
