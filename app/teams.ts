export const TEAMS = [
  { id: "mercedes", name: "Mercedes", initials: "MER", primary: "#00a19c", accent: "#c8fffb", avatar: "/team-avatars/mercedes.png" },
  { id: "ferrari", name: "Ferrari", initials: "FER", primary: "#e80020", accent: "#ffd400", avatar: "/team-avatars/ferrari.png" },
  { id: "mclaren", name: "McLaren", initials: "MCL", primary: "#ff8000", accent: "#111111", avatar: "/team-avatars/mclaren.png" },
  { id: "red-bull", name: "Red Bull Racing", initials: "RBR", primary: "#2436ff", accent: "#ffdf00", avatar: "/team-avatars/red-bull.png" },
  { id: "racing-bulls", name: "Racing Bulls", initials: "RB", primary: "#eef3ff", accent: "#1f45d8", avatar: "/team-avatars/racing-bulls.png" },
  { id: "alpine", name: "Alpine", initials: "ALP", primary: "#1684e8", accent: "#ff87bc", avatar: "/team-avatars/alpine.png" },
  { id: "haas", name: "Haas F1 Team", initials: "HAS", primary: "#f1f1f1", accent: "#e6002d", avatar: "/team-avatars/haas.png" },
  { id: "audi", name: "Audi", initials: "AUD", primary: "#f50537", accent: "#111111", avatar: "/team-avatars/audi.png" },
  { id: "williams", name: "Williams", initials: "WIL", primary: "#00a3e0", accent: "#ffffff", avatar: "/team-avatars/williams.png" },
  { id: "aston-martin", name: "Aston Martin", initials: "AMR", primary: "#006f62", accent: "#cedc00", avatar: "/team-avatars/aston-martin.png" },
  { id: "cadillac", name: "Cadillac", initials: "CAD", primary: "#111111", accent: "#d6b45d", avatar: "/team-avatars/cadillac.png" },
] as const;

export type TeamId = (typeof TEAMS)[number]["id"];

export function getTeam(id: string | null | undefined) {
  return TEAMS.find((team) => team.id === id) ?? null;
}

export function isTeamId(value: unknown): value is TeamId {
  return typeof value === "string" && TEAMS.some((team) => team.id === value);
}
