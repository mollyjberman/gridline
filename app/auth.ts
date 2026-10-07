import { env } from "cloudflare:workers";
import { getTeam, isTeamId, type TeamId } from "./teams";

const COOKIE = "gridline_session";
const SESSION_DAYS = 30;
const PASSWORD_HASH_ITERATIONS = 100_000;
const encoder = new TextEncoder();

const blockedNames = [
  "verstappen", "norris", "piastri", "russell", "antonelli", "leclerc", "hamilton",
  "hadjar", "lawson", "lindblad", "gasly", "colapinto", "ocon", "bearman", "hulkenberg",
  "bortoleto", "sainz", "albon", "alonso", "stroll", "perez", "bottas",
  "mercedes", "ferrari", "mclaren", "redbull", "racingbulls", "alpine", "haas", "audi",
  "williams", "astonmartin", "cadillac", "formulaone", "formula1", "fia", "admin", "moderator",
  "fuck", "shit", "bitch", "cunt", "nigger", "nigga", "faggot", "nazi", "hitler",
];

export type AccountUser = {
  id: string;
  username: string;
  favoriteTeam: TeamId;
  countryCode: string | null;
};

export function validateUsername(input: unknown): { value?: string; error?: string } {
  if (typeof input !== "string") return { error: "Enter a username." };
  const value = input.trim().toLowerCase();
  if (!/^[A-Za-z0-9_]{3,20}$/.test(value)) return { error: "Use 3–20 letters, numbers, or underscores." };
  const normalized = value.replace(/[^a-z0-9]/g, "").replace(/[013457]/g, (character) => ({
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
  })[character] ?? character);
  if (blockedNames.some((term) => normalized.includes(term))) return { error: "That username is reserved. Try another." };
  return { value };
}

export function validatePassword(input: unknown): string | null {
  if (typeof input !== "string" || input.length < 8) return "Your password must be at least 8 characters.";
  if (input.length > 128) return "Password is too long.";
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PASSWORD_HASH_ITERATIONS }, key, 256);
  return `pbkdf2_sha256$${PASSWORD_HASH_ITERATIONS}$${toBase64(salt)}$${toBase64(new Uint8Array(bits))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, iterationsText, saltText, expectedText] = stored.split("$");
  if (algorithm !== "pbkdf2_sha256" || !saltText || !expectedText) return false;
  const iterations = Number(iterationsText);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromBase64(saltText), iterations }, key, 256);
  return timingSafeEqual(new Uint8Array(bits), fromBase64(expectedText));
}

export async function createSession(userId: string, request: Request): Promise<{ cookie: string }> {
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toBase64(tokenBytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const tokenHash = await sha256(token);
  await env.DB.prepare(
    "INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, datetime('now', ?), datetime('now'))",
  ).bind(crypto.randomUUID(), userId, tokenHash, `+${SESSION_DAYS} days`).run();
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return { cookie: `${COOKIE}=${token}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${SESSION_DAYS * 86400}` };
}

export async function getCurrentUser(request: Request): Promise<AccountUser | null> {
  const token = readCookie(request.headers.get("cookie"), COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.favorite_team AS favoriteTeam, u.country_code AS countryCode
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > datetime('now')`,
  ).bind(tokenHash).first<{ id: string; username: string; favoriteTeam: string; countryCode: string | null }>();
  if (!row?.username || !isTeamId(row.favoriteTeam)) return null;
  return { ...row, favoriteTeam: row.favoriteTeam };
}

export async function deleteSession(request: Request): Promise<void> {
  const token = readCookie(request.headers.get("cookie"), COOKIE);
  if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function clearSessionCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function publicUser(user: AccountUser) {
  return { ...user, team: getTeam(user.favoriteTeam) };
}

export function getCountryCode(request: Request): string | null {
  const candidate = (request as Request & { cf?: { country?: string } }).cf?.country ?? request.headers.get("cf-ipcountry");
  const value = candidate?.trim().toUpperCase();
  return value && /^[A-Z]{2}$/.test(value) && value !== "XX" ? value : null;
}

function readCookie(header: string | null, name: string) {
  return header?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

async function sha256(value: string) {
  return toBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function toBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
