import FallbackImage from "@/components/ui/FallbackImage";

export function BudgetHeader() {
  return (
    <section className="grid gap-4 rounded-3xl bg-[#063643] p-7 text-white md:grid-cols-[1.1fr_0.9fr]">
      <div>
        <h1 className="max-w-xl text-3xl font-semibold leading-tight tracking-wide md:text-4xl">
          Your Budget: Balance Food & Spending
        </h1>
        <p className="mt-3 max-w-lg text-sm text-white/75">
          Track groceries and dining out, stay within your weekly target, and spot savings.
        </p>
      </div>
      <div className="flex items-center justify-center">
        <div className="flex h-40 w-56 items-center justify-center md:h-44 md:w-64">
          <FallbackImage
            src="/budget/budgeticon2.png"
            alt=""
            className="h-auto max-h-full w-full object-contain opacity-95"
          />
        </div>
      </div>
    </section>
  );
}
