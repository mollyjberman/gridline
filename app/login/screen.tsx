"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { TEAMS } from "@/app/teams";

export function AuthScreen() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [step, setStep] = useState<1 | 2>(1);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [favoriteTeam, setFavoriteTeam] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (mode === "register" && step === 1) { setError(""); setStep(2); return; }
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password, favoriteTeam }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
      window.location.replace("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.");
    } finally { setBusy(false); }
  }

  function switchMode(next: "login" | "register") { setMode(next); setStep(1); setError(""); }

  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authArt"><div className="issueTag">GRIDLINE #001</div><h1>ENTER THE<br/><span>PADDOCK</span></h1><p>One daily category. Three lives. One place on the grid.</p></div>
        <div className="authFormPanel">
          <div className="authTabs" role="tablist">
            <button className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>LOG IN</button>
            <button className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>CREATE ACCOUNT</button>
          </div>
          <form onSubmit={submit}>
            {mode === "register" && step === 2 ? (
              <><div className="formHeading"><small>STEP 2 OF 2</small><h2>PICK YOUR TEAM</h2></div><div className="teamPicker">
                {TEAMS.map((team) => <label key={team.id} style={{ "--team": team.primary, "--team-accent": team.accent } as React.CSSProperties}><input type="radio" name="team" value={team.id} checked={favoriteTeam === team.id} onChange={() => setFavoriteTeam(team.id)} required/><span className="teamBadge"><Image src={team.avatar} alt="" width={82} height={82} /></span><b>{team.name}</b></label>)}
              </div><div className="formActions"><button type="button" className="backButton" onClick={() => setStep(1)}>BACK</button><button className="primaryButton" disabled={busy}>{busy ? "CREATING…" : "JOIN THE GRID"}</button></div></>
            ) : (
              <><div className="formHeading"><small>{mode === "register" ? "STEP 1 OF 2" : "RACER ACCESS"}</small><h2>{mode === "register" ? "BUILD YOUR PROFILE" : "WELCOME BACK"}</h2></div>
              <label className="field"><span>USERNAME</span><input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} minLength={3} maxLength={20} pattern="[A-Za-z0-9_]+" required/></label>
              <label className="field"><span>PASSWORD</span><input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required/></label>
              {mode === "register" && <p className="formHint"><b>Username:</b> unique, appropriate, and not a driver or team name. <b>Password:</b> any 8 or more characters.</p>}
              <button type="submit" className="primaryButton authSubmit" disabled={busy}>{busy ? "CHECKING…" : mode === "login" ? "START YOUR RUN" : "CHOOSE A TEAM"}</button></>
            )}
            {error && <p className="authError" role="alert">{error}</p>}
          </form>
        </div>
      </section>
    </main>
  );
}
