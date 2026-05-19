import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { categoryColorStyle, categoryMeta, rotationFor } from "@/lib/events-data";
import { BottomNav } from "@/components/BottomNav";
import { ArrowLeft, CalendarDays, Flag, Link as LinkIcon, MapPin, Send, User } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPost, postToEvent, reportPost, type EventReportReason } from "@/lib/posts";
import { useAuth } from "@/lib/auth";
import { EventStatusBadge, VerifiedOrganizerBadge } from "@/components/EventTrustBadges";
import { categoryLabelKey, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/event/$id")({
  component: EventDetail,
  notFoundComponent: EventNotFound,
});

function EventNotFound() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen flex items-center justify-center px-6 text-center">
      <div>
        <p className="font-hand text-4xl">{t("postNotFound")}</p>
        <Link to="/" className="font-hand-clean underline mt-2 inline-block">
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}

function EventDetail() {
  const { id } = Route.useParams();
  const { t } = useI18n();
  const { data: post, isLoading } = useQuery({
    queryKey: ["posts", id],
    queryFn: () => fetchPost(id),
  });
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <p className="font-hand text-4xl">{t("loadingPost")}</p>
      </div>
    );
  }
  if (!post) throw notFound();

  return <EventDetailContent post={post} />;
}

function EventDetailContent({
  post,
}: {
  post: NonNullable<Awaited<ReturnType<typeof fetchPost>>>;
}) {
  const { user } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const event = postToEvent(post);
  const meta = categoryMeta[event.category];
  const rot = rotationFor(event.id);
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([{ who: event.host, text: t("publishedOnMap") }]);
  const [draft, setDraft] = useState("");
  const [reportReason, setReportReason] = useState<EventReportReason>("fake_event");
  const [reportDescription, setReportDescription] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const reportMutation = useMutation({
    mutationFn: reportPost,
    onSuccess: async () => {
      setReportMessage(t("reportSent"));
      setReportDescription("");
      await queryClient.invalidateQueries({ queryKey: ["posts", post.id] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (error) => setReportMessage(error instanceof Error ? error.message : t("reportError")),
  });
  const evidenceLinks = [
    { label: t("officialWebsite"), url: event.evidence?.officialUrl },
    { label: t("instagram"), url: event.evidence?.instagramUrl },
    { label: t("flyer"), url: event.evidence?.flyerImageUrl },
  ].filter((link) => link.url);

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-6 flex items-center justify-between">
        <Link
          to="/"
          className="size-10 rounded-full bg-card paper-texture flex items-center justify-center postit-shadow border border-border/40"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <span className="font-hand-clean text-sm text-muted-foreground">{t("postDetail")}</span>
        <span className="size-10" />
      </header>

      <div className="px-5 mt-6">
        <article
          className="relative paper-texture postit-shadow-lg rounded-[3px] p-6 pt-9"
          style={{ ...categoryColorStyle(event.category), transform: `rotate(${rot}deg)` }}
        >
          <span className="tape left-1/2 -top-3 -translate-x-1/2 rotate-[-3deg]" />
          <div className="flex items-center justify-between font-hand-clean text-xs uppercase tracking-wider opacity-80">
            <span>
              {meta.icon} {t(categoryLabelKey(event.category))}
            </span>
            <span>
              {event.distance} {t("nearYou")}
            </span>
          </div>
          <h1 className="font-hand text-4xl leading-tight mt-2">{event.title}</h1>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <EventStatusBadge status={event.status} />
            {event.isVerifiedOrganizer && <VerifiedOrganizerBadge />}
          </div>
          <p className="font-hand-clean text-base mt-3 leading-snug">{event.description}</p>
          {event.status !== "verified" && (
            <p className="mt-3 rounded-lg bg-background/50 px-3 py-2 font-hand-clean text-sm">
              {t("communityWarning")}
            </p>
          )}
          {event.imageUrl && (
            <img
              src={event.imageUrl}
              alt={event.title}
              className="mt-4 max-h-72 w-full rounded-lg object-cover border border-foreground/10 postit-shadow"
            />
          )}

          <div className="mt-4 grid grid-cols-1 gap-2 font-hand-clean text-sm">
            <Row icon={<CalendarDays className="size-4" />}>
              {t("eventDateTime", { date: event.date, time: event.time })}
            </Row>
            <Row icon={<MapPin className="size-4" />}>{event.location}</Row>
            <Row icon={<User className="size-4" />}>{t("leftBy", { host: event.host })}</Row>
            <Row icon={<User className="size-4" />}>
              {t("participants", { count: event.participants })}
            </Row>
          </div>

          {evidenceLinks.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {evidenceLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.url ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-background/60 px-3 py-1 font-hand-clean text-xs underline-offset-2 hover:underline"
                >
                  <LinkIcon className="size-3" />
                  {link.label}
                </a>
              ))}
            </div>
          )}

          <button
            onClick={() => setJoined((j) => !j)}
            className={`mt-5 w-full rounded-lg py-3 font-hand text-2xl transition-all postit-shadow ${
              joined
                ? "bg-foreground text-background"
                : "bg-background text-foreground hover:-translate-y-0.5"
            }`}
          >
            {joined ? t("joined") : t("join")}
          </button>
        </article>
      </div>

      <section className="px-5 mt-8">
        <div className="bg-card paper-texture rounded-xl px-4 py-4 postit-shadow border border-border/40">
          <h2 className="font-hand text-3xl">{t("reportEvent")}</h2>
          <div className="mt-3 grid gap-2">
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value as EventReportReason)}
              className="w-full rounded-md border border-input bg-background/70 px-3 py-2 font-hand-clean outline-none"
              disabled={!user || post.author_id === user.uid}
            >
              <option value="fake_event">{t("fakeEvent")}</option>
              <option value="wrong_location">{t("wrongLocation")}</option>
              <option value="spam">{t("spam")}</option>
              <option value="offensive_content">{t("offensiveContent")}</option>
              <option value="scam">{t("scam")}</option>
              <option value="duplicate">{t("duplicate")}</option>
              <option value="other">{t("other")}</option>
            </select>
            <textarea
              value={reportDescription}
              onChange={(e) => setReportDescription(e.target.value)}
              placeholder={t("optionalDescription")}
              rows={2}
              disabled={!user || post.author_id === user.uid}
              className="w-full rounded-md border border-input bg-background/70 px-3 py-2 font-hand-clean outline-none"
            />
            <button
              onClick={() =>
                reportMutation.mutate({
                  eventId: event.id,
                  reason: reportReason,
                  description: reportDescription,
                })
              }
              disabled={!user || post.author_id === user.uid || reportMutation.isPending}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 font-hand text-xl text-background postit-shadow disabled:opacity-50"
            >
              <Flag className="size-5" />
              {reportMutation.isPending ? t("sending") : t("report")}
            </button>
          </div>
          {reportMessage && <p className="mt-3 font-hand-clean text-sm">{reportMessage}</p>}
        </div>
      </section>

      <section className="px-5 mt-10">
        <h2 className="font-hand text-3xl mb-3">{t("chat")}</h2>
        <div className="space-y-2">
          {messages.map((m, i) => (
            <div
              key={i}
              className="bg-card paper-texture rounded-xl px-4 py-2 postit-shadow border border-border/30"
            >
              <p className="font-hand-clean text-xs text-muted-foreground">{m.who}</p>
              <p className="font-hand-clean text-base">{m.text}</p>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.trim()) return;
            setMessages((m) => [...m, { who: t("you"), text: draft.trim() }]);
            setDraft("");
          }}
          className="mt-3 flex gap-2"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("writeSomething")}
            className="flex-1 bg-card paper-texture rounded-xl px-4 py-3 font-hand-clean outline-none border border-border/40 postit-shadow"
          />
          <button className="size-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center postit-shadow">
            <Send className="size-5" />
          </button>
        </form>
      </section>

      <BottomNav />
    </div>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="opacity-70">{icon}</span>
      <span>{children}</span>
    </div>
  );
}
