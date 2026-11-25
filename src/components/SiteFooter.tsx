export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border/70 py-6 text-center text-sm text-muted-foreground">
      © {year} Bloom Clinic. All rights reserved.
    </footer>
  );
}
