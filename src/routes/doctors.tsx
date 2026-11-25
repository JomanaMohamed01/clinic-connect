import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { ensureAuthReady, getSession } from "@/lib/clinic-storage";
import { isReceptionStaff } from "@/lib/reception-api";

export const Route = createFileRoute("/doctors")({
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
  component: () => <Outlet />,
});
