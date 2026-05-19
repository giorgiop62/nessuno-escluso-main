import { Link } from "@tanstack/react-router";
import { Home, Map, Plus, Bell, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

type NavItem = {
  to: "/" | "/map" | "/create" | "/notifications" | "/profile";
  icon: typeof Home;
  labelKey: string;
  primary?: boolean;
};

const items: NavItem[] = [
  { to: "/", icon: Home, labelKey: "navHome" },
  { to: "/map", icon: Map, labelKey: "navMap" },
  { to: "/create", icon: Plus, labelKey: "navCreate", primary: true },
  { to: "/notifications", icon: Bell, labelKey: "navNotifications" },
  { to: "/profile", icon: User, labelKey: "navProfile" },
];

export function BottomNav({ nativeLinks = false }: { nativeLinks?: boolean }) {
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 px-3 pb-3 pt-2">
      <div className="mx-auto max-w-md bg-card/95 backdrop-blur paper-texture rounded-2xl postit-shadow border border-border/40 px-2 py-2">
        <ul className="flex items-end justify-between">
          {items.map(({ to, icon: Icon, labelKey, primary }) => (
            <li key={to} className="flex-1">
              {nativeLinks ? (
                <a
                  href={to}
                  className={`flex flex-col items-center gap-0.5 py-1 transition-colors hover:text-foreground ${
                    window.location.pathname === to ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <NavIcon Icon={Icon} primary={primary} />
                  <span className="font-hand-clean text-[11px]">{t(labelKey)}</span>
                </a>
              ) : (
                <Link
                  to={to}
                  activeProps={{ className: "text-primary" }}
                  className="flex flex-col items-center gap-0.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
                  activeOptions={{ exact: to === "/" }}
                >
                  <NavIcon Icon={Icon} primary={primary} />
                  <span className="font-hand-clean text-[11px]">{t(labelKey)}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function NavIcon({ Icon, primary }: { Icon: typeof Home; primary?: boolean }) {
  if (primary) {
    return (
      <span className="-mt-6 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground postit-shadow rotate-[-4deg]">
        <Icon className="size-6" />
      </span>
    );
  }

  return <Icon className="size-5" />;
}
