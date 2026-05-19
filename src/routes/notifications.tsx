import { createFileRoute } from "@tanstack/react-router";
import { BottomNav } from "@/components/BottomNav";
import { useQuery } from "@tanstack/react-query";
import { fetchPosts } from "@/lib/posts";
import { categoryColorStyle } from "@/lib/events-data";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/notifications")({ component: Notifications });

function Notifications() {
  const { t, language } = useI18n();
  const { data: posts = [] } = useQuery({ queryKey: ["posts"], queryFn: fetchPosts });
  const items = posts
    .filter(
      (post) =>
        post.status === "verified" ||
        (post.status === "community" && post.creator_trust_score >= 25),
    )
    .slice(0, 8)
    .map((post) => ({
      emoji: post.status === "verified" ? "✅" : "📌",
      text: t("reliableEventNearby", { title: post.title }),
      time: new Date(post.created_at).toLocaleDateString(language === "en" ? "en-US" : "it-IT", {
        day: "2-digit",
        month: "short",
      }),
      category: post.category,
    }));

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-hand text-4xl">{t("notificationsTitle")}</h1>
        <p className="font-hand-clean text-sm text-muted-foreground">
          {t("notificationsSubtitle")}
        </p>
      </header>

      <ul className="px-4 space-y-3">
        {items.map((n, i) => (
          <li
            key={i}
            className="paper-texture postit-shadow rounded-[3px] p-4"
            style={{
              ...categoryColorStyle(n.category),
              transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{n.emoji}</span>
              <div className="flex-1">
                <p className="font-hand-clean text-base leading-snug">{n.text}</p>
                <p className="font-hand-clean text-xs opacity-60 mt-1">{n.time}</p>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && (
          <li className="text-center font-hand text-2xl text-muted-foreground mt-10">
            {t("noReliableNotifications")}
          </li>
        )}
      </ul>

      <BottomNav />
    </div>
  );
}
