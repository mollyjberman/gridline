import { chatGPTSignOutPath, requireChatGPTUser } from "./chatgpt-auth";
import { Game } from "./game";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requireChatGPTUser("/");

  return (
    <main>
      <header className="topbar">
        <div className="brand" aria-label="Gridline Daily">
          <span className="brandMark" aria-hidden="true" />
          <span>GRIDLINE</span>
          <span className="brandLight">DAILY</span>
        </div>
        <div className="account">
          <span className="accountName">{user.displayName}</span>
          <a href={chatGPTSignOutPath("/")} target="_top">Sign out</a>
        </div>
      </header>
      <Game />
      <footer>
        <span>UNOFFICIAL FAN GAME</span>
        <span>CAREER STATS THROUGH THE 2024 SEASON</span>
      </footer>
    </main>
  );
}
