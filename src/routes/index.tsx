import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { categoryMeta, type Category } from "@/lib/events-data";
import { PostIt } from "@/components/PostIt";
import { BottomNav } from "@/components/BottomNav";
import { MapPin, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { fetchPosts, postToEvent } from "@/lib/posts";
import { getStoredCurrentCity, reverseGeocodeCity, storeCurrentCity } from "@/lib/geocoding";
import { categoryLabelKey, useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

export const Route = createFileRoute("/")({
  component: Home,
});

const categories = Object.keys(categoryMeta) as Category[];

function Home() {
  const { t } = useI18n();
  const [active, setActive] = useState<Category | "tutti">("tutti");
  const [q, setQ] = useState("");
  const [city, setCity] = useState(() => getStoredCurrentCity() || t("detectingCity"));
  const {
    data: posts = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["posts"],
    queryFn: fetchPosts,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setCity(t("yourArea"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (position.coords.accuracy > 20000 && getStoredCurrentCity()) return;

        void reverseGeocodeCity({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
          .then((nextCity) => {
            setCity(nextCity);
            storeCurrentCity(nextCity);
          })
          .catch(() => setCity(t("yourArea")));
      },
      () => setCity(t("yourArea")),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }, [t]);

  useEffect(() => {
    if (city !== t("yourArea") && city !== t("detectingCity")) return;
    const firstLocatedPost = posts.find((post) => post.location_name);
    if (firstLocatedPost?.location_name) {
      setCity(firstLocatedPost.location_name);
      storeCurrentCity(firstLocatedPost.location_name);
    }
  }, [city, posts, t]);

  const events = useMemo(() => {
    return posts.map(postToEvent).filter((e) => {
      const matchCat = active === "tutti" || e.category === active;
      const matchQ = q.trim() === "" || e.title.toLowerCase().includes(q.toLowerCase());
      return matchCat && matchQ;
    });
  }, [active, posts, q]);

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4">
        <div className="flex items-center gap-2 text-muted-foreground font-hand-clean text-sm">
          <MapPin className="size-4" /> {city}
        </div>
        <img
          src="/nessuno-escluso-logo.png"
          alt="Nessuno Escluso"
          className="mt-2 h-auto w-full max-w-[320px] rounded-lg object-contain"
        />
        <p className="font-hand-clean text-base text-muted-foreground mt-1">{t("homeSubtitle")}</p>
        <div className="mt-3">
          <LanguageSwitcher />
        </div>

        <div className="mt-5 flex items-center gap-2 bg-card paper-texture rounded-xl px-3 py-2 postit-shadow border border-border/40">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="bg-transparent outline-none flex-1 font-hand-clean text-base placeholder:text-muted-foreground"
          />
        </div>

        <div className="mt-4 -mx-5 px-5 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Chip
            label={t("all")}
            emoji="📍"
            active={active === "tutti"}
            onClick={() => setActive("tutti")}
          />
          {categories.map((c) => (
            <Chip
              key={c}
              label={t(categoryLabelKey(c))}
              emoji={categoryMeta[c].icon}
              active={active === c}
              onClick={() => setActive(c)}
            />
          ))}
        </div>
      </header>

      <section className="px-3">
        {isLoading && (
          <p className="text-center font-hand text-2xl text-muted-foreground mt-10">
            {t("loadingPosts")}
          </p>
        )}
        {error && (
          <p className="text-center font-hand-clean text-sm text-muted-foreground mt-10">
            {t("postsLoadError")}
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {events.map((e, i) => (
            <PostIt key={e.id} event={e} index={i} />
          ))}
        </div>
        {!isLoading && !error && events.length === 0 && (
          <p className="text-center font-hand text-2xl text-muted-foreground mt-10">
            {t("noPosts")}
          </p>
        )}
      </section>

      <BottomNav />
    </div>
  );
}

function Chip({
  label,
  emoji,
  active,
  onClick,
}: {
  label: string;
  emoji: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-1.5 font-hand-clean text-sm border transition-all ${
        active
          ? "bg-foreground text-background border-foreground postit-shadow"
          : "bg-card/70 text-foreground border-border/50 hover:bg-card"
      }`}
    >
      <span className="mr-1">{emoji}</span>
      {label}
    </button>
  );
}
