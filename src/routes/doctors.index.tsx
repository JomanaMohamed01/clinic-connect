import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SPECIALTIES, SPECIALTY_GROUPS } from "@/lib/specialties";

export const Route = createFileRoute("/doctors/")({
  head: () => ({
    meta: [
      { title: "Choose a specialization — Bloom Clinic" },
      { name: "description", content: "Pick a specialization, then choose a doctor at Bloom Clinic." },
    ],
  }),
  component: SpecializationsPage,
});

function SpecializationsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        <div className="mb-8">
          <h1 className="font-display text-4xl">Choose a specialization</h1>
          <p className="mt-2 text-muted-foreground">Pick the area of care you need.</p>
        </div>

        <div className="space-y-8">
          {SPECIALTY_GROUPS.map((group) => (
            <section key={group}>
              <h2 className="mb-3 font-display text-lg">{group}</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {SPECIALTIES.filter((item) => item.group === group).map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.slug}
                      to="/doctors/$specialty"
                      params={{ specialty: item.slug }}
                      className="group flex items-center gap-4 rounded-3xl border border-border/60 bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-card"
                    >
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-primary-foreground shadow-soft ${item.color}`}
                      >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <span className="min-w-0 flex-1">
                        <span className="block font-display text-lg leading-tight">{item.name}</span>
                        {item.detail && (
                          <span className="mt-0.5 block text-sm text-muted-foreground">{item.detail}</span>
                        )}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
