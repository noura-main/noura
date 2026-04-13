import FallbackImage from "@/components/ui/FallbackImage";

export default function PreferencesHeader() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#063643] px-8 py-10 text-white ">
      <div className="max-w-[55%]">
        <h1 className="text-5xl font-semibold leading-tight tracking-tight">
        Your Preferences:
        </h1>
        <p className="mt-1 text-3xl font-light leading-tight opacity-90">
        Your Meals Match Your Values
        </p>
      </div>

      <div className="pointer-events-none absolute bottom-0 right-6 flex items-end select-none">
        <FallbackImage
          src="/preferences/preferences.png"
          alt="Meal plan illustration"
          className="h-45 w-72 object-contain object-bottom drop-shadow-2xl"
        />
      </div>
    </div>
  );
}
