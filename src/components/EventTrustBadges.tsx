import { type EventStatus } from "@/lib/events-data";
import { useI18n } from "@/lib/i18n";

const statusLabelKey: Record<EventStatus, string> = {
  community: "statusCommunity",
  spontaneous: "statusSpontaneous",
  verified: "statusVerified",
  under_review: "statusUnderReview",
  hidden: "statusHidden",
  rejected: "statusRejected",
};

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const { t } = useI18n();

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 font-hand-clean text-[11px] leading-none ${statusClassName(status)}`}
    >
      {t(statusLabelKey[status] ?? "statusCommunity")}
    </span>
  );
}

function statusClassName(status: EventStatus) {
  switch (status) {
    case "spontaneous":
      return "bg-background/70 text-foreground";
    case "verified":
      return "bg-emerald-100 text-emerald-950";
    case "under_review":
      return "bg-background/70 text-foreground";
    case "hidden":
    case "rejected":
      return "bg-background/70 text-foreground";
    case "community":
    default:
      return "bg-background/70 text-foreground";
  }
}

export function VerifiedOrganizerBadge() {
  const { t } = useI18n();

  return (
    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 font-hand-clean text-[11px] leading-none text-emerald-950">
      {t("verifiedOrganizer")}
    </span>
  );
}
