import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createSession, getCountryCode, hashPassword, validatePassword, validateUsername } from "@/app/auth";
import { isTeamId } from "@/app/teams";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: unknown; password?: unknown; favoriteTeam?: unknown };
    const username = validateUsername(body.username);
    if (username.error) return NextResponse.json({ error: username.error }, { status: 400 });
    const passwordError = validatePassword(body.password);
    if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
    if (!isTeamId(body.favoriteTeam)) return NextResponse.json({ error: "Choose your favorite team." }, { status: 400 });

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(body.password as string);
    try {
      await env.DB.prepare(
        `INSERT INTO users (id, email, display_name, username, password_hash, favorite_team, country_code, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      ).bind(id, `${id}@accounts.invalid`, username.value, username.value, passwordHash, body.favoriteTeam, getCountryCode(request)).run();
    } catch (error) {
      if (String(error).toLowerCase().includes("unique")) return NextResponse.json({ error: "That username is already taken." }, { status: 409 });
      throw error;
    }
    const session = await createSession(id, request);
    return NextResponse.json({ ok: true }, { status: 201, headers: { "set-cookie": session.cookie } });
  } catch (error) {
    console.error("Registration failed", error);
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503 });
  }
}
