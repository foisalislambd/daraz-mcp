import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  Settings,
  Store,
  TerminalSquare,
} from "lucide-react";

/**
 * Admin shell adapted from ZenPanel (https://github.com/foisalislambd/zenpanel).
 * Copyright (c) 2026 Foisal Islam, MIT License. See VENDOR-LICENSE.
 */
export const adminConfig = {
  brand: {
    name: "Daraz MCP",
    tagline: "Seller control panel",
    letter: "D",
    siteUrl: "/",
    loginDescription:
      "Connect your Daraz shop, issue an MCP key, and let Claude, Cursor, or VS Code run the store with you.",
    loginFeatures: [
      "Bangladesh first, other Daraz regions configurable",
      "Read tools stay separate from confirmed writes",
      "Works on desktop and mobile",
    ],
  },
};

export type AdminNavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  section?: string;
};

export const adminNavItems: AdminNavItem[] = [
  { name: "Dashboard", section: "Overview", href: "/admin", icon: LayoutDashboard },
  {
    name: "Shops",
    section: "Daraz",
    href: "/admin/shops",
    icon: Store,
    description: "Connect and disconnect seller accounts",
  },
  {
    name: "API keys",
    section: "Daraz",
    href: "/admin/keys",
    icon: KeyRound,
    description: "MCP URL, create, copy, revoke, rotate",
  },
  {
    name: "Client setup",
    section: "Daraz",
    href: "/admin/setup",
    icon: TerminalSquare,
    description: "Claude, Cursor, and VS Code configs",
  },
  {
    name: "Usage",
    section: "Account",
    href: "/admin/usage",
    icon: ScrollText,
    description: "Filterable MCP call log",
  },
  {
    name: "Billing",
    section: "Account",
    href: "/admin/billing",
    icon: CreditCard,
    description: "Plan limits. Payments are not wired yet.",
  },
  { name: "Settings", section: "Account", href: "/admin/settings", icon: Settings },
];
