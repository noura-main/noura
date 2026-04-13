import { NavbarUser } from "@/components/sidebar/NavbarUser";
import { UserStatBar } from "@/components/sidebar/UserStatBar";
import PreferencesHeader from "@/components/preferences/PreferencesHeading";
import PreferencesContent from "@/components/preferences/PreferencesContent";

export default function PreferencesPage() {
  return (
    <div className="h-screen bg-[#f3f4f6] p-3 text-[#0d2e38]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <NavbarUser />
        <main className="h-full overflow-hidden rounded-3xl bg-[#eceef0] p-6">
          <PreferencesContent />
        </main>
        <UserStatBar />
      </div>
    </div>
  );
}
