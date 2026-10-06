import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "./auth";
import { getTeam } from "./teams";
import { Game } from "./game";

export const dynamic = "force-dynamic";

export default async function Home() {
  const requestHeaders = await headers();
  const user = await getCurrentUser(new Request("https://gridline.local/", { headers: requestHeaders }));
  if (!user) redirect("/login");
  const team = getTeam(user.favoriteTeam)!;

  return (
    <main>
      <header className="topbar">
        <div className="brand" aria-label="Gridline Daily">
          <span className="brandMark" aria-hidden="true"><Image src="/gridline-checkered-flag.png" alt="" width={78} height={52} /></span>
          <span className="brandLockup"><b>GRIDLINE</b><small>RACING GAMES</small></span>
        </div>
        <div className="account">
          <span className="profileBadge" style={{ "--team": team.primary } as React.CSSProperties}><Image src={team.avatar} alt={`${team.name} profile helmet`} width={64} height={64} /></span>
          <span className="accountName">{user.username}</span>
          <form action="/api/auth/logout" method="post"><button type="submit">Sign out</button></form>
        </div>
      </header>
      <Game />
      <footer>
        <span>GRIDLINE PRESS · UNOFFICIAL FAN GAME</span>
        <span>CAREER STATS THROUGH THE 2024 SEASON</span>
      </footer>
    </main>
  );
}
