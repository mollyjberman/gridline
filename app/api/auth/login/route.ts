import { env } from "cloudflare:workers";
import { NextResponse } from "next/server";
import { createSession, validateUsername, verifyPassword } from "@/app/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { username?: unknown; password?: unknown };
    const username = validateUsername(body.username);
    if (!username.value || typeof body.password !== "string") return invalid();
    const row = await env.DB.prepare("SELECT id, password_hash AS passwordHash FROM users WHERE username = ? COLLATE NOCASE")
      .bind(username.value).first<{ id: string; passwordHash: string | null }>();
    if (!row?.passwordHash || !(await verifyPassword(body.password, row.passwordHash))) return invalid();
    const session = await createSession(row.id, request);
    return NextResponse.json({ ok: true }, { headers: { "set-cookie": session.cookie } });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 503 });
  }
}

function invalid() {
  return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
}
