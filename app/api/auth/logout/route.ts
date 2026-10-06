import { NextResponse } from "next/server";
import { clearSessionCookie, deleteSession } from "@/app/auth";

export async function POST(request: Request) {
  await deleteSession(request);
  return NextResponse.redirect(new URL("/login", request.url), { status: 303, headers: { "set-cookie": clearSessionCookie() } });
}
