import Link from "next/link";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "How To Use", href: "#howto" },
  { label: "Contact", href: "#contact" },
  { label: "FAQ", href: "#faq" },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#063643]/95 py-1 pb-7 text-white backdrop-blur md:px-5">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6">
        <p className="text-2xl font-semibold tracking-tight">Noura</p>

        <nav className="hidden items-center gap-10 text-sm font-medium md:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-white/90 transition-colors duration-300 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
        <Link
          href="/auth/login"
          className="rounded-full border border-white/70 px-8 py-2 text-sm font-semibold text-white transition-colors duration-300 hover:bg-white/10"          >
          Login
        </Link>
        </div>
      </div>
    </header>
  );
}
