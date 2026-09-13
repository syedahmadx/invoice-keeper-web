"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/scan", label: "Scan" },
  { href: "/invoices", label: "Invoices" },
  { href: "/settings", label: "Settings" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Primary navigation. On narrow screens it drops to its own full-width row of
 * tabs under the wordmark rather than hiding behind a menu button — four
 * destinations do not earn a hamburger.
 */
export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="w-full sm:w-auto">
      <ul className="-mx-1 flex items-center gap-0.5 overflow-x-auto sm:mx-0 sm:gap-1">
        {LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <li key={link.href} className="flex-1 sm:flex-none">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "block rounded-md px-3 py-1.5 text-center text-sm transition-colors",
                  active
                    ? "bg-accent-soft font-semibold text-accent"
                    : "text-ink-muted hover:bg-sunken hover:text-ink",
                ].join(" ")}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
