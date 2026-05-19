export type Category = "musica" | "sport" | "social" | "cultura" | "food" | "nightlife";

export type EventStatus =
  | "community"
  | "spontaneous"
  | "verified"
  | "under_review"
  | "hidden"
  | "rejected";

export const visibleEventStatuses: EventStatus[] = ["community", "spontaneous", "verified"];

export const eventStatusMeta: Record<EventStatus, { label: string; className: string }> = {
  community: { label: "📌 Evento Community", className: "bg-background/70 text-foreground" },
  spontaneous: { label: "⚠️ Evento spontaneo", className: "bg-amber-100 text-amber-950" },
  verified: { label: "✅ Evento verificato", className: "bg-emerald-100 text-emerald-950" },
  under_review: { label: "🔍 In revisione", className: "bg-sky-100 text-sky-950" },
  hidden: { label: "🚫 Nascosto", className: "bg-zinc-200 text-zinc-900" },
  rejected: { label: "🚫 Rifiutato", className: "bg-red-100 text-red-950" },
};

export type LocalEvent = {
  id: string;
  title: string;
  description: string;
  category: Category;
  time: string;
  date: string;
  distance: string;
  location: string;
  participants: number;
  host: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string | null;
  createdAt?: string;
  authorId?: string;
  status: EventStatus;
  verificationScore: number;
  reportCount: number;
  isVerifiedOrganizer: boolean;
  evidence?: {
    officialUrl?: string | null;
    instagramUrl?: string | null;
    flyerImageUrl?: string | null;
    venueName?: string | null;
    venueAddress?: string | null;
    contactPhone?: string | null;
    organizerName?: string | null;
  };
};

export const categoryMeta: Record<Category, { label: string; color: string; icon: string }> = {
  musica: { label: "Musica", color: "bg-postit-music", icon: "🎵" },
  sport: { label: "Sport", color: "bg-postit-sport", icon: "⚽" },
  social: { label: "Social", color: "bg-postit-social", icon: "💬" },
  cultura: { label: "Cultura", color: "bg-postit-cultura", icon: "🎭" },
  food: { label: "Food & Drink", color: "bg-postit-food", icon: "🍕" },
  nightlife: { label: "Nightlife", color: "bg-postit-night", icon: "🌙" },
};

const categoryColors: Record<Category, string> = {
  musica: "#f2d94e",
  sport: "#7dcc8a",
  social: "#83c7dc",
  cultura: "#b392d7",
  food: "#dc9b5e",
  nightlife: "#e58ac0",
};

export function categoryColorStyle(category: Category) {
  return { backgroundColor: categoryColors[category] };
}

export const sampleEvents: LocalEvent[] = [
  {
    id: "1",
    title: "Jam session in piazza",
    description: "Porta la tua chitarra, cantiamo insieme al tramonto.",
    category: "musica",
    time: "19:30",
    date: "Oggi",
    distance: "320m",
    location: "Piazza San Marco",
    participants: 14,
    host: "Luca",
    status: "community",
    verificationScore: 0,
    reportCount: 0,
    isVerifiedOrganizer: false,
  },
  {
    id: "2",
    title: "Partita a basket 3v3",
    description: "Cerchiamo qualcuno per completare le squadre. Livello casual.",
    category: "sport",
    time: "18:00",
    date: "Oggi",
    distance: "550m",
    location: "Campetto via Roma",
    participants: 5,
    host: "Marta",
    status: "spontaneous",
    verificationScore: 0,
    reportCount: 0,
    isVerifiedOrganizer: false,
  },
  {
    id: "3",
    title: "Aperitivo al parco",
    description: "Coperta, vino e chiacchiere. Veniamo in 6, unisciti!",
    category: "social",
    time: "20:00",
    date: "Stasera",
    distance: "180m",
    location: "Parco Sempione",
    participants: 9,
    host: "Sara",
    status: "community",
    verificationScore: 0,
    reportCount: 0,
    isVerifiedOrganizer: false,
  },
  {
    id: "4",
    title: "Mostra fotografica indie",
    description: "Apertura piccola galleria, ingresso libero.",
    category: "cultura",
    time: "17:00",
    date: "Domani",
    distance: "1.2km",
    location: "Via dei Mille 14",
    participants: 22,
    host: "Galleria K",
    status: "verified",
    verificationScore: 70,
    reportCount: 0,
    isVerifiedOrganizer: true,
  },
  {
    id: "5",
    title: "Pizza & Film all'aperto",
    description: "Schermo, pizza al taglio e una commedia anni 90.",
    category: "food",
    time: "21:00",
    date: "Sabato",
    distance: "800m",
    location: "Cortile Officine",
    participants: 31,
    host: "Dario",
    status: "community",
    verificationScore: 0,
    reportCount: 0,
    isVerifiedOrganizer: false,
  },
  {
    id: "6",
    title: "DJ set sul tetto",
    description: "Vista città, drink e house music fino a tardi.",
    category: "nightlife",
    time: "23:00",
    date: "Sabato",
    distance: "1.5km",
    location: "Rooftop Garibaldi",
    participants: 47,
    host: "Club N",
    status: "verified",
    verificationScore: 70,
    reportCount: 0,
    isVerifiedOrganizer: true,
  },
  {
    id: "7",
    title: "Corsa all'alba",
    description: "5km tranquilli lungo il fiume. Caffè offerto a fine corsa.",
    category: "sport",
    time: "06:30",
    date: "Domenica",
    distance: "400m",
    location: "Lungofiume",
    participants: 8,
    host: "RunCrew",
    status: "spontaneous",
    verificationScore: 0,
    reportCount: 0,
    isVerifiedOrganizer: false,
  },
  {
    id: "8",
    title: "Cena vegana condivisa",
    description: "Ognuno porta un piatto. Tema: cucina del mondo.",
    category: "food",
    time: "20:30",
    date: "Venerdì",
    distance: "900m",
    location: "Casa di Elena",
    participants: 12,
    host: "Elena",
    status: "community",
    verificationScore: 0,
    reportCount: 0,
    isVerifiedOrganizer: false,
  },
  {
    id: "9",
    title: "Lettura di poesie",
    description: "Poeti locali leggono i loro testi. Microfono aperto a fine serata.",
    category: "cultura",
    time: "19:00",
    date: "Giovedì",
    distance: "650m",
    location: "Libreria Pagina 12",
    participants: 17,
    host: "Pagina 12",
    status: "verified",
    verificationScore: 60,
    reportCount: 0,
    isVerifiedOrganizer: true,
  },
];

// Deterministic small rotation per id so layout doesn't jump on rerender
export const rotationFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const r = (h % 900) / 100; // 0..9
  return (r - 4.5).toFixed(2); // -4.5..+4.5 deg
};

export const offsetFor = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 17 + id.charCodeAt(i)) >>> 0;
  const x = (h % 21) - 10; // -10..10 px
  const y = ((h >> 5) % 17) - 8; // -8..8 px
  return { x, y };
};
