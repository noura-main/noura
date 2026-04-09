import Link from "next/link";

export function HeroCard() {
  return (
    <section className="flex h-full flex-col justify-between rounded-[2.25rem] bg-[#F1EFE9] p-8 shadow-sm md:p-12">
      <div className="space-y-8">
        <h1 className="max-w-md text-5xl font-bold leading-[1.03] tracking-tight text-[#0C2F3D] md:text-7xl">
          Something Healthy Something Tasty
        </h1>
        <p className="max-w-lg text-base leading-8 text-[#35515B] md:text-[1.06rem]">
          Noura makes cooking simple, turning what you already have into meals,
          snacks, and plans that fit your lifestyle, with smart suggestions,
          nutrition insights, and budget-friendly options.
        </p>
      </div>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/auth/sign-up"
          className="inline-flex min-w-40 items-center justify-center rounded-full bg-[#004B5A] px-9 py-3 text-lg font-medium text-white transition-colors duration-300 hover:bg-[#036275]"
        >
          Start Cooking
        </Link>
        <button
          type="button"
          className="min-w-40 rounded-full border-2 border-[#2A3D45] bg-transparent px-9 py-3 text-lg font-medium text-[#2A3D45] transition-colors duration-300 hover:bg-[#E7E1D7]"
        >
          Preview
        </button>
      </div>
    </section>
  );
}
