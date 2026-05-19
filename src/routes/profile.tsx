import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/lib/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePost,
  ensureUserProfile,
  fetchMyPosts,
  fetchPosts,
  fetchUserProfile,
  postToEvent,
  updatePost,
  type PostRow,
} from "@/lib/posts";
import { Edit3, LogIn, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { getStoredCurrentCity, reverseGeocodeCity, storeCurrentCity } from "@/lib/geocoding";
import { categoryColorStyle, categoryMeta, type Category } from "@/lib/events-data";
import { EventStatusBadge } from "@/components/EventTrustBadges";
import { categoryLabelKey, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/profile")({
  component: Profile,
});

function Profile() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: posts = [] } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });
  const { data: myPosts = [] } = useQuery({
    queryKey: ["my-posts", user?.uid],
    queryFn: fetchMyPosts,
    enabled: Boolean(user),
  });
  const { data: profile } = useQuery({
    queryKey: ["profiles", user?.uid],
    queryFn: () => fetchUserProfile(user!.uid),
    enabled: Boolean(user),
  });
  const [city, setCity] = useState(() => getStoredCurrentCity() || t("yourArea"));
  const mine = user ? myPosts : posts.filter((post) => post.author_id === user?.uid);
  const mineEvents = mine.map(postToEvent);
  const name = user?.displayName || user?.email?.split("@")[0] || t("you");
  const initial = name.charAt(0).toUpperCase();
  const [editingPost, setEditingPost] = useState<PostRow | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostRow | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deletePost,
    onSuccess: async () => {
      setDeletingPost(null);
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
      await queryClient.invalidateQueries({ queryKey: ["my-posts"] });
    },
  });

  useEffect(() => {
    if (!user || !navigator.geolocation) return;
    void ensureUserProfile();

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
  }, [t, user]);

  useEffect(() => {
    if (city !== t("yourArea")) return;
    const firstMineWithLocation = posts.find(
      (post) => post.author_id === user?.uid && post.location_name,
    );
    if (firstMineWithLocation?.location_name) {
      setCity(firstMineWithLocation.location_name);
      storeCurrentCity(firstMineWithLocation.location_name);
    }
  }, [city, posts, t, user]);

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-2 relative">
        {user && (
          <button
            onClick={() => void signOut()}
            aria-label={t("logout")}
            title={t("logout")}
            className="absolute right-5 top-8 flex size-10 items-center justify-center rounded-full bg-card/90 text-foreground postit-shadow border border-border/40 transition-transform hover:-translate-y-0.5"
          >
            <LogOut className="size-5" />
          </button>
        )}

        <div className="flex items-center gap-4 pr-12">
          <div
            className="size-16 rounded-full paper-texture postit-shadow flex items-center justify-center font-hand text-3xl rotate-[-4deg]"
            style={categoryColorStyle("food")}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt={name} className="size-full rounded-full object-cover" />
            ) : (
              initial
            )}
          </div>
          <div>
            <h1 className="font-hand text-4xl leading-none">
              {loading ? "..." : user ? name : t("guest")}
            </h1>
            <p className="font-hand-clean text-sm text-muted-foreground">
              {user ? t("postsLeft", { city, count: mineEvents.length }) : t("loginToCreatePost")}
            </p>
          </div>
        </div>
        {!user && (
          <button
            onClick={() => void signInWithGoogle()}
            className="mt-4 w-full rounded-xl bg-foreground text-background py-3 font-hand text-xl postit-shadow flex items-center justify-center gap-2"
          >
            <LogIn className="size-5" />
            {t("loginGoogle")}
          </button>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2">
          {[
            { n: mineEvents.length, l: t("created") },
            { n: profile?.trust_score ?? 0, l: t("trust") },
            { n: profile?.reports_received_count ?? 0, l: t("reports") },
          ].map((s) => (
            <div
              key={s.l}
              className="bg-card paper-texture rounded-xl py-3 text-center postit-shadow border border-border/30"
            >
              <div className="font-hand text-2xl">{s.n}</div>
              <div className="font-hand-clean text-xs text-muted-foreground">{s.l}</div>
            </div>
          ))}
        </div>
        {profile?.is_verified_organizer && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 font-hand-clean text-sm text-emerald-950">
            <ShieldCheck className="size-4" />
            {t("verifiedOrganizer")}
          </div>
        )}
      </header>

      <section className="px-3 mt-6">
        <h2 className="font-hand text-2xl px-2 mb-2">{t("yourPosts")}</h2>
        <div className="grid grid-cols-2 gap-3">
          {mine.map((post, i) => (
            <ProfilePostIt
              key={post.id}
              post={post}
              index={i}
              onEdit={() => setEditingPost(post)}
              onDelete={() => setDeletingPost(post)}
            />
          ))}
        </div>
        {user && mineEvents.length === 0 && (
          <p className="text-center font-hand text-2xl text-muted-foreground mt-10">
            {t("noOwnPosts")}
          </p>
        )}
      </section>

      <EditPostDialog
        post={editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
        onSaved={async () => {
          setEditingPost(null);
          await queryClient.invalidateQueries({ queryKey: ["posts"] });
          await queryClient.invalidateQueries({ queryKey: ["my-posts"] });
        }}
      />

      {deletingPost && (
        <SimpleModal onClose={() => setDeletingPost(null)} labelledBy="delete-post-title">
          <h2 id="delete-post-title" className="font-hand text-3xl leading-tight">
            {t("deletePostTitle")}
          </h2>
          <p className="mt-2 font-hand-clean text-sm text-muted-foreground">
            {t("deletePostText")}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDeletingPost(null)}
              className="rounded-xl border border-border bg-background px-4 py-3 font-hand-clean text-sm"
            >
              {t("cancel")}
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate(deletingPost.id)}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-destructive px-4 py-3 font-hand-clean text-sm text-destructive-foreground disabled:opacity-50"
            >
              {deleteMutation.isPending ? t("saving") : t("delete")}
            </button>
          </div>
        </SimpleModal>
      )}

      <BottomNav />
    </div>
  );
}

function ProfilePostIt({
  post,
  index,
  onEdit,
  onDelete,
}: {
  post: PostRow;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const event = postToEvent(post);
  const meta = categoryMeta[event.category];
  const { t } = useI18n();

  return (
    <article
      className="paper-texture postit-shadow rounded-[2px] p-4 pt-6 text-card-foreground animate-stick"
      style={{ ...categoryColorStyle(event.category), animationDelay: `${index * 60}ms` }}
    >
      <span className="font-hand-clean text-xs uppercase tracking-wider opacity-70">
        {meta.icon} {t(categoryLabelKey(event.category))}
      </span>
      <h3 className="font-hand text-2xl leading-tight mt-1 break-words">{event.title}</h3>
      <div className="mt-2">
        <EventStatusBadge status={event.status} />
      </div>
      <div className="mt-3 flex items-end justify-between font-hand-clean text-sm">
        <span>
          {event.date} · {event.time}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onEdit}
          aria-label={t("editPost")}
          className="flex size-9 items-center justify-center rounded-full bg-background/70 postit-shadow border border-foreground/10"
        >
          <Edit3 className="size-4" />
        </button>
        <button
          onClick={onDelete}
          aria-label={t("deletePost")}
          className="flex size-9 items-center justify-center rounded-full bg-background/70 text-destructive postit-shadow border border-foreground/10"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </article>
  );
}

function EditPostDialog({
  post,
  onOpenChange,
  onSaved,
}: {
  post: PostRow | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<Category>("social");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [locationName, setLocationName] = useState("");
  const [error, setError] = useState("");
  const { t } = useI18n();

  useEffect(() => {
    if (!post) return;
    const expiresAt = post.expires_at ? new Date(post.expires_at) : new Date();
    setTitle(post.title);
    setDescription(post.description.replace(/^Dove: .+$/m, "").trim());
    setCategory(post.category);
    setEventDate(expiresAt.toISOString().slice(0, 10));
    setEventTime(expiresAt.toTimeString().slice(0, 5));
    setLocationName(post.location_name ?? "");
    setError("");
  }, [post]);

  const mutation = useMutation({
    mutationFn: updatePost,
    onSuccess: () => void onSaved(),
    onError: (nextError) =>
      setError(nextError instanceof Error ? nextError.message : t("editPostError")),
  });

  const handleSave = () => {
    if (!post || !title.trim()) return;
    const expiresAt = new Date(`${eventDate}T${eventTime}`);
    if (
      !eventDate ||
      !eventTime ||
      Number.isNaN(expiresAt.getTime()) ||
      expiresAt.getTime() <= Date.now()
    ) {
      setError(t("chooseFutureDate"));
      return;
    }
    setError("");
    mutation.mutate({
      id: post.id,
      title: title.trim(),
      description: description.trim(),
      category,
      locationName: locationName.trim() || null,
      expiresAt: expiresAt.toISOString(),
    });
  };

  return (
    <>
      {post && (
        <SimpleModal onClose={() => onOpenChange(false)} labelledBy="edit-post-title">
          <h2 id="edit-post-title" className="font-hand text-3xl">
            {t("editPostTitle")}
          </h2>
          <div className="space-y-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("title")}
              className="w-full rounded-md border border-input bg-background/60 px-3 py-2 font-hand-clean outline-none"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("description")}
              rows={3}
              className="w-full rounded-md border border-input bg-background/60 px-3 py-2 font-hand-clean outline-none"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full rounded-md border border-input bg-background/60 px-3 py-2 font-hand-clean outline-none"
            >
              {Object.entries(categoryMeta).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.icon} {t(categoryLabelKey(value))}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={eventDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setEventDate(e.target.value)}
                className="min-w-0 rounded-md border border-input bg-background/60 px-3 py-2 font-hand-clean outline-none"
              />
              <input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
                className="min-w-0 rounded-md border border-input bg-background/60 px-3 py-2 font-hand-clean outline-none"
              />
            </div>
            <input
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder={t("where")}
              className="w-full rounded-md border border-input bg-background/60 px-3 py-2 font-hand-clean outline-none"
            />
            {error && <p className="font-hand-clean text-sm text-destructive">{error}</p>}
            <button
              onClick={handleSave}
              disabled={!title.trim() || mutation.isPending}
              className="w-full rounded-xl bg-foreground text-background py-3 font-hand text-xl postit-shadow disabled:opacity-50"
            >
              {mutation.isPending ? t("saving") : t("saveChanges")}
            </button>
          </div>
        </SimpleModal>
      )}
    </>
  );
}

function SimpleModal({
  children,
  labelledBy,
  onClose,
}: {
  children: ReactNode;
  labelledBy: string;
  onClose: () => void;
}) {
  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-5 paper-texture postit-shadow-lg"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-background/70 font-hand-clean text-lg"
        >
          x
        </button>
        {children}
      </section>
    </div>
  );
}
