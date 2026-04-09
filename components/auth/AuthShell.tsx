import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export type AuthShellVariant = "login" | "signup";

export function AuthShell({
  variant,
  children,
}: {
  variant: AuthShellVariant;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col justify-center bg-[url('/auth/bg-auth.png')] bg-cover bg-center px-4 py-8 sm:py-10 [background-image:linear-gradient(135deg,#e8e8ea_0%,#dfe4e6_50%,#e4e2df_100%)]">
      <div className="relative z-10 mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-2xl md:rounded-[2.25rem]">
        <div className="flex min-h-[600px] flex-col lg:flex-row">
          <div className="relative flex min-h-[280px] flex-1 flex-col justify-between bg-[#063643] p-8 text-white lg:max-w-[48%] lg:min-h-0 lg:p-10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#063643]/80 to-[#063643]" />
            <div className="relative z-10 flex w-full flex-1 flex-col items-center justify-center py-4">
              <div className="relative h-[100%] w-[100%] max-h-[420px] max-w-[420px]">
                <Image
                  src={
                    variant === "login"
                      ? "/auth/login-hero.png"
                      : "/auth/signup-hero.png"
                  }
                  alt=""
                  fill
                  className="object-contain object-center"
                  priority
                />
              </div>
            </div>

            <p className="relative z-10 text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
              {variant === "login"
                ? "Welcome Back!"
                : "Your Next Meal Starts Here"}
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-center bg-white p-8 lg:p-10">
            <Link
              href="/"
              className="mb-6 text-sm font-medium text-[#35515B] underline-offset-4 hover:underline"
            >
              ← Back to home
            </Link>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
