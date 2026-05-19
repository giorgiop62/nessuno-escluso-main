import { Link } from "@tanstack/react-router";
import {
  categoryColorStyle,
  categoryMeta,
  rotationFor,
  offsetFor,
  type LocalEvent,
} from "@/lib/events-data";
import { EventStatusBadge, VerifiedOrganizerBadge } from "@/components/EventTrustBadges";
import { categoryLabelKey, useI18n } from "@/lib/i18n";

type Props = {
  event: LocalEvent;
  index?: number;
};

export function PostIt({ event, index = 0 }: Props) {
  const meta = categoryMeta[event.category];
  const rot = rotationFor(event.id);
  const { x, y } = offsetFor(event.id);
  const { t } = useI18n();

  return (
    <Link
      to="/event/$id"
      params={{ id: event.id }}
      className="relative block paper-texture postit-shadow rounded-[2px] p-4 pt-6 text-card-foreground transition-transform duration-300 hover:-translate-y-1 hover-wiggle animate-stick"
      style={{
        ...categoryColorStyle(event.category),
        ["--r" as string]: `${rot}deg`,
        transform: `translate(${x}px, ${y}px) rotate(${rot}deg)`,
        animationDelay: `${index * 60}ms`,
      }}
    >
      <span className="tape left-1/2 -top-2 -translate-x-1/2 rotate-[-2deg]" />
      <div className="flex items-start justify-between gap-2">
        <span className="font-hand-clean text-xs uppercase tracking-wider opacity-70">
          {meta.icon} {t(categoryLabelKey(event.category))}
        </span>
        <span className="font-hand-clean text-xs opacity-70">{event.distance}</span>
      </div>
      <h3 className="font-hand text-2xl leading-tight mt-1 break-words">{event.title}</h3>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <EventStatusBadge status={event.status} />
        {event.isVerifiedOrganizer && <VerifiedOrganizerBadge />}
      </div>
      <div className="mt-3 flex items-end justify-between font-hand-clean text-sm">
        <span>
          {event.date} · {event.time}
        </span>
        <span className="opacity-80">👥 {event.participants}</span>
      </div>
    </Link>
  );
}
