import Link from "next/link";
import { ButtonLink, Logo, ThemeToggle } from "@/design-system/components";
import { landing } from "@/content/copy";

export function SiteHeader() {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5">
        <Logo />
        <nav aria-label="Main navigation" className="flex flex-1 items-center gap-1 max-md:hidden">
          {landing.nav.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-full px-3 py-2 text-sm font-medium text-ink-muted hover:bg-ink/6 hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <span className="flex-1 md:hidden" />
        <ThemeToggle />
        <Link href="/app" className="rounded-full px-3 py-2 text-sm font-medium hover:bg-ink/6 max-sm:hidden">
          {landing.hero.secondary}
        </Link>
        <ButtonLink href="/onboarding" size="sm" data-testid="header-cta">
          Get started
        </ButtonLink>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="no-print border-t border-line bg-paper-deep">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-6 px-5 py-10">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-2 text-sm text-ink-muted">{landing.footer.tagline}</p>
          <p className="mt-3 text-xs text-ink-muted">{landing.footer.demoNote}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {[...landing.nav, ...landing.footer.links].map((l) => (
            <Link key={l.href} href={l.href} className="text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
