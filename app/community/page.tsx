import { NavbarUser } from "@/components/sidebar/NavbarUser";
import { UserStatBar } from "@/components/sidebar/UserStatBar";
import CommunityFeed from "@/components/community/CommunityFeed";
import CommunityHeader from "@/components/community/CommunityHeader"

export default function CommunityPage() {
  return (
    <div className="h-screen bg-[#f3f4f6] p-3 text-[#0d2e38]">
      <div className="mx-auto grid h-full max-w-[1500px] grid-cols-1 gap-2 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
        <NavbarUser />
        <main className="h-full overflow-y-auto rounded-3xl bg-[#eceef0] p-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <CommunityHeader />
                  <div 
                    className="mt-5 flex items-center justify-center gap-1.5 px-3 py-1 rounded-full border shadow-sm"
                    style={{ 
                      background: "#FFFBEB", 
                      borderColor: "#FEF3C7",
                      color: "#D97706" 
                      
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D97706] animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      Under Development
                    </span>
                  </div>
          <CommunityFeed />
        </main>
        <UserStatBar />
      </div>
    </div>
  );
}
