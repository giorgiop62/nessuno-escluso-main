import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, Bell, Home, LogIn, Map, MapPin, Plus, User } from "lucide-react";

import { categoryColorStyle, categoryMeta, type Category } from "@/lib/events-data";
import { useAuth } from "@/lib/auth";
import { reverseGeocodeCity, storeCurrentCity } from "@/lib/geocoding";
import { categoryLabelKey, useI18n } from "@/lib/i18n";

const categories = Object.keys(categoryMeta) as Category[];

export function CreateEventForm({ onCreated }: { onCreated: (id: string) => void }) {
  const { user, loading, signInWithGoogle } = useAuth();
  const { t } = useI18n();
  const titleRef = useRef<HTMLInputElement | null>(null);
  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const whereRef = useRef<HTMLInputElement | null>(null);
  const [category, setCategory] = useState<Category>("social");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [isSpontaneous, setIsSpontaneous] = useState(false);
  const [officialUrl, setOfficialUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [flyerImageUrl, setFlyerImageUrl] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [organizerName, setOrganizerName] = useState("");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationName, setLocationName] = useState("");
  const [geoError, setGeoError] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);
  const [formError, setFormError] = useState("");
  const [stuck, setStuck] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const meta = categoryMeta[category];

  const handleSignIn = async () => {
    setFormError("");
    try {
      await signInWithGoogle();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
    }
  };

  const handleDetectLocation = () => {
    if (!user) {
      setFormError(t("loginToCreateError"));
      return;
    }
    if (!navigator.geolocation) {
      setGeoError(t("enableLocation"));
      return;
    }

    setGeoLoading(true);
    setGeoError("");
    setLocationName(t("findingCity"));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextCoords = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setCoords(nextCoords);
        setLocationName(t("findingCity"));
        setGeoError("");

        void reverseGeocodeCity(nextCoords)
          .then((city) => {
            setLocationName(city);
            storeCurrentCity(city);
          })
          .catch(() => setLocationName(t("positionDetected")));
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setCoords(null);
        setLocationName("");
        setGeoError(t("enableLocation"));
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 8000 },
    );
  };

  const handleStick = async () => {
    const title = titleRef.current?.value.trim() ?? "";
    const desc = descRef.current?.value.trim() ?? "";
    const where = whereRef.current?.value.trim() ?? "";
    if (!title) return;
    if (!user) {
      setFormError(t("loginToCreateError"));
      return;
    }
    if (!coords) {
      setFormError(t("needRealLocation"));
      return;
    }
    if (!eventDate || !eventTime) {
      setFormError(t("chooseDateTime"));
      return;
    }
    const expiresAt = new Date(`${eventDate}T${eventTime}`);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      setFormError(t("chooseFutureDate"));
      return;
    }
    setFormError("");
    setSubmitting(true);
    try {
      const { createPost } = await import("@/lib/posts");
      const post = await createPost({
        title,
        description: [desc, where && `Dove: ${where}`].filter(Boolean).join("\n"),
        category,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationName: where || locationName || null,
        expiresAt: expiresAt.toISOString(),
        isSpontaneous,
        verificationEvidence: {
          officialUrl,
          instagramUrl,
          flyerImageUrl,
          venueName,
          venueAddress,
          contactPhone,
          organizerName,
        },
      });
      setStuck(true);
      setTimeout(() => onCreated(post.id), 800);
    } catch (error) {
      setFormError(formatCreateError(error, t));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-6 flex items-center justify-between">
        <a
          href="/"
          className="size-10 rounded-full bg-card paper-texture flex items-center justify-center postit-shadow border border-border/40"
        >
          <ArrowLeft className="size-5" />
        </a>
        <h1 className="font-hand text-3xl">{t("leavePost")}</h1>
        <span className="size-10" />
      </header>

      {!loading && !user && (
        <div className="px-5 mt-5">
          <div className="bg-card paper-texture rounded-xl px-4 py-4 postit-shadow border border-border/40">
            <p className="font-hand text-2xl leading-tight">{t("signInToPost")}</p>
            <p className="font-hand-clean text-sm text-muted-foreground mt-1">
              {t("createRequiresLogin")}
            </p>
            <button
              onClick={() => void handleSignIn()}
              className="mt-3 w-full rounded-xl bg-foreground text-background py-3 font-hand text-xl postit-shadow flex items-center justify-center gap-2"
            >
              <LogIn className="size-5" />
              {t("loginGoogle")}
            </button>
          </div>
        </div>
      )}

      <div className="px-5 mt-4">
        <p className="font-hand-clean text-sm text-muted-foreground mb-3">{t("chooseColor")}</p>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`paper-texture rounded-md px-3 py-2 font-hand-clean text-sm postit-shadow border-2 transition-all ${
                category === c ? "border-foreground -translate-y-0.5" : "border-transparent"
              }`}
              style={categoryColorStyle(c)}
            >
              {categoryMeta[c].icon} {t(categoryLabelKey(c))}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 mt-8">
        <div
          className="relative rounded-lg border border-foreground/10 p-5"
          style={categoryColorStyle(category)}
        >
          <input
            ref={titleRef}
            disabled={!user}
            placeholder={t("titlePlaceholder")}
            className="w-full bg-transparent outline-none font-hand text-3xl placeholder:text-foreground/30"
          />
          <textarea
            ref={descRef}
            disabled={!user}
            placeholder={t("descriptionPlaceholder")}
            rows={3}
            className="w-full bg-transparent outline-none font-hand-clean text-base mt-2 resize-none placeholder:text-foreground/30"
          />
          <div className="mt-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={eventDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEventDate(e.target.value)}
                disabled={!user}
                className="min-w-0 bg-background/40 rounded px-2 py-1.5 outline-none font-hand-clean text-sm border border-foreground/10"
              />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                disabled={!user}
                className="min-w-0 bg-background/40 rounded px-2 py-1.5 outline-none font-hand-clean text-sm border border-foreground/10"
              />
            </div>
            <input
              ref={whereRef}
              disabled={!user}
              placeholder={t("wherePlaceholder")}
              className="w-full bg-background/40 rounded px-2 py-1.5 outline-none font-hand-clean text-sm placeholder:text-foreground/40 border border-foreground/10"
            />
            <label className="flex items-center gap-2 bg-background/40 rounded px-2 py-1.5 font-hand-clean text-sm border border-foreground/10">
              <input
                type="checkbox"
                checked={isSpontaneous}
                onChange={(e) => setIsSpontaneous(e.target.checked)}
                disabled={!user}
              />
              {t("spontaneousEvent")}
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 font-hand-clean text-sm">
            <div className="flex items-center gap-2 bg-background/40 rounded px-2 py-1.5 border border-foreground/10">
              <MapPin className="size-4 opacity-70" />
              <span className="truncate">
                {coords ? locationName || t("positionDetected") : geoError || t("needRealLocation")}
              </span>
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={!user || geoLoading}
              className="w-full rounded-md bg-background/60 px-3 py-2 font-hand-clean text-sm postit-shadow border border-foreground/10 disabled:opacity-50"
            >
              {geoLoading ? t("detectingLocation") : t("detectLocation")}
            </button>
          </div>
        </div>

        <section className="mt-5 rounded-xl border border-border/40 bg-card/70 p-4">
          <button
            type="button"
            onClick={() => setShowEvidence((value) => !value)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <span>
              <span className="block font-hand text-2xl leading-none">{t("optionalEvidence")}</span>
              <span className="mt-1 block font-hand-clean text-xs text-muted-foreground">
                {t("evidenceHelp")}
              </span>
            </span>
            <span className="font-hand-clean text-sm">{showEvidence ? "-" : "+"}</span>
          </button>
          {showEvidence && (
            <div className="mt-3 grid gap-2">
              {[
                [t("officialWebsite"), officialUrl, setOfficialUrl],
                [t("instagram"), instagramUrl, setInstagramUrl],
                [t("flyerUrl"), flyerImageUrl, setFlyerImageUrl],
                [t("venueName"), venueName, setVenueName],
                [t("venueAddress"), venueAddress, setVenueAddress],
                [t("contactPhone"), contactPhone, setContactPhone],
                [t("organizer"), organizerName, setOrganizerName],
              ].map(([placeholder, value, setter]) => (
                <input
                  key={placeholder as string}
                  value={value as string}
                  onChange={(e) => (setter as Dispatch<SetStateAction<string>>)(e.target.value)}
                  disabled={!user}
                  placeholder={placeholder as string}
                  className="w-full rounded-md border border-input bg-background/70 px-3 py-2 font-hand-clean text-sm outline-none"
                />
              ))}
            </div>
          )}
        </section>

        {formError && <p className="mt-4 font-hand-clean text-sm text-destructive">{formError}</p>}

        <button
          type="button"
          onClick={() => void handleStick()}
          disabled={!eventDate || !eventTime || stuck || submitting || !user}
          className="mt-6 w-full rounded-xl bg-foreground text-background py-4 font-hand text-2xl postit-shadow disabled:opacity-50"
        >
          {stuck ? t("stuck") : submitting ? t("sticking") : t("stickToBoard")}
        </button>
      </div>

      <NativeBottomNav />
    </div>
  );
}

function NativeBottomNav() {
  const { t } = useI18n();
  const items = [
    { to: "/", icon: Home, labelKey: "navHome" },
    { to: "/map", icon: Map, labelKey: "navMap" },
    { to: "/create", icon: Plus, labelKey: "navCreate", primary: true },
    { to: "/notifications", icon: Bell, labelKey: "navNotifications" },
    { to: "/profile", icon: User, labelKey: "navProfile" },
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2">
      <div className="mx-auto max-w-md bg-card/95 backdrop-blur paper-texture rounded-2xl postit-shadow border border-border/40 px-2 py-2">
        <ul className="flex items-end justify-between">
          {items.map(({ to, icon: Icon, labelKey, primary }) => (
            <li key={to} className="flex-1">
              <a
                href={to}
                className={`flex flex-col items-center gap-0.5 py-1 transition-colors hover:text-foreground ${
                  window.location.pathname === to ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {primary ? (
                  <span className="-mt-6 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground postit-shadow rotate-[-4deg]">
                    <Icon className="size-6" />
                  </span>
                ) : (
                  <Icon className="size-5" />
                )}
                <span className="font-hand-clean text-[11px]">{t(labelKey)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function formatCreateError(error: unknown, t: (key: string) => string) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Missing or insufficient permissions")) return t("firestoreCreateBlocked");
  return message || t("createPostError");
}
