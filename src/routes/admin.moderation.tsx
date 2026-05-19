import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  fetchModerationPosts,
  fetchReports,
  fetchUserProfile,
  isCurrentUserAdmin,
  setPostStatus,
  updateUserTrustScore,
  verifyOrganizer,
  type PostRow,
} from "@/lib/posts";
import { BottomNav } from "@/components/BottomNav";
import { EventStatusBadge } from "@/components/EventTrustBadges";
import { type EventStatus } from "@/lib/events-data";
import { useState, type ReactNode } from "react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/admin/moderation")({
  component: AdminModeration,
});

function AdminModeration() {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: isAdmin = false, isLoading: checkingAdmin } = useQuery({
    queryKey: ["admin", user?.uid],
    queryFn: isCurrentUserAdmin,
    enabled: Boolean(user),
  });
  const { data: posts = [] } = useQuery({
    queryKey: ["moderation-posts"],
    queryFn: fetchModerationPosts,
    enabled: isAdmin,
  });
  const { data: reports = [] } = useQuery({
    queryKey: ["reports"],
    queryFn: fetchReports,
    enabled: isAdmin,
  });
  const statusMutation = useMutation({
    mutationFn: ({ postId, status }: { postId: string; status: EventStatus }) =>
      setPostStatus(postId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["moderation-posts"] });
      await queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  if (loading || checkingAdmin) {
    return <AdminShell>{t("checkingPermissions")}</AdminShell>;
  }

  if (!user || !isAdmin) {
    return <AdminShell>{t("adminOnly")}</AdminShell>;
  }

  return (
    <div className="min-h-screen pb-32">
      <header className="px-5 pt-8 pb-4">
        <h1 className="font-hand text-4xl">{t("moderation")}</h1>
        <p className="font-hand-clean text-sm text-muted-foreground">{t("moderationSubtitle")}</p>
      </header>

      <section className="px-4 space-y-3">
        {posts.map((post) => (
          <ModerationCard
            key={post.id}
            post={post}
            onStatus={(status) => statusMutation.mutate({ postId: post.id, status })}
          />
        ))}
        {posts.length === 0 && (
          <p className="text-center font-hand text-2xl text-muted-foreground mt-10">
            {t("noModerationPosts")}
          </p>
        )}
      </section>

      <section className="px-4 mt-8">
        <h2 className="font-hand text-3xl mb-2">{t("reports")}</h2>
        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.report_id}
              className="rounded-xl border border-border/40 bg-card px-4 py-3 paper-texture postit-shadow"
            >
              <p className="font-hand-clean text-sm">
                <strong>{report.reason}</strong> {t("onEvent", { id: report.event_id })}
              </p>
              {report.description && (
                <p className="mt-1 font-hand-clean text-sm text-muted-foreground">
                  {report.description}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}

function ModerationCard({
  post,
  onStatus,
}: {
  post: PostRow;
  onStatus: (status: EventStatus) => void;
}) {
  const [trustScore, setTrustScore] = useState(String(post.creator_trust_score));
  const queryClient = useQueryClient();
  const { t } = useI18n();
  const trustMutation = useMutation({
    mutationFn: () => updateUserTrustScore(post.author_id, Number(trustScore)),
    onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["moderation-posts"] }),
  });
  const organizerMutation = useMutation({
    mutationFn: () => verifyOrganizer(post.author_id),
    onSuccess: async () => {
      await fetchUserProfile(post.author_id);
      await queryClient.invalidateQueries({ queryKey: ["moderation-posts"] });
    },
  });

  return (
    <article className="rounded-xl border border-border/40 bg-card p-4 paper-texture postit-shadow">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-hand text-3xl leading-none">{post.title}</h2>
          <p className="font-hand-clean text-sm text-muted-foreground">
            {post.creator_name} · {post.report_count} {t("reports")} · score{" "}
            {post.verification_score}
          </p>
        </div>
        <EventStatusBadge status={post.status} />
      </div>
      <p className="mt-3 font-hand-clean text-sm whitespace-pre-line">{post.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {(["verified", "community", "under_review", "hidden", "rejected"] as EventStatus[]).map(
          (status) => (
            <button
              key={status}
              onClick={() => onStatus(status)}
              className="rounded-full bg-foreground px-3 py-1.5 font-hand-clean text-xs text-background"
            >
              {t(
                {
                  verified: "statusVerified",
                  community: "statusCommunity",
                  under_review: "statusUnderReview",
                  hidden: "statusHidden",
                  rejected: "statusRejected",
                  spontaneous: "statusSpontaneous",
                }[status],
              )}
            </button>
          ),
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <input
          value={trustScore}
          onChange={(e) => setTrustScore(e.target.value)}
          type="number"
          min={-100}
          max={100}
          className="min-w-0 flex-1 rounded-md border border-input bg-background/70 px-3 py-2 font-hand-clean outline-none"
        />
        <button
          onClick={() => trustMutation.mutate()}
          className="rounded-md bg-primary px-3 py-2 font-hand-clean text-sm text-primary-foreground"
        >
          Trust
        </button>
        <button
          onClick={() => organizerMutation.mutate()}
          className="rounded-md bg-emerald-700 px-3 py-2 font-hand-clean text-sm text-white"
        >
          {t("verifyOrganizer")}
        </button>
      </div>
    </article>
  );
}

function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen pb-32">
      <main className="px-5 pt-10">
        <div className="rounded-xl border border-border/40 bg-card p-5 text-center paper-texture postit-shadow">
          <p className="font-hand text-3xl">{children}</p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
