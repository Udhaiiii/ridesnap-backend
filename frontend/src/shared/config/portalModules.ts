import type { Role } from '@/features/auth/authStore';

export type PortalCardId =
  | 'card-photographer'
  | 'card-photoDesk'
  | 'card-printDash'
  | 'card-wristband'
  | 'card-admin'
  | 'card-receipt'
  | 'card-report';

export type AccentColor = 'amber' | 'green' | 'blue' | 'violet' | 'rose';

export interface PortalModule {
  id: PortalCardId;
  path: string;
  href: string;
  icon: string;
  roleLabel: string;
  title: string;
  description: string;
  tag: string;
  accent: AccentColor;
  featured?: boolean;
  /** Roles allowed to open this module (admin always allowed). */
  accessRoles: Role[];
}

/** Seven staff modules — mirrors legacy index.html cards. */
export const PORTAL_MODULES: PortalModule[] = [
  {
    id: 'card-photographer',
    path: '/photographer',
    href: '/photographer',
    icon: '📷',
    roleLabel: 'Photographer',
    title: 'Photographer App',
    description:
      'Upload ride photos directly from your phone. Scan guest wristband QR and link photos instantly. Supports multiple photos per guest per ride.',
    tag: 'ridesnap.html',
    accent: 'amber',
    featured: true,
    accessRoles: ['photographer', 'admin'],
  },
  {
    id: 'card-photoDesk',
    path: '/photo-desk',
    href: '/photo-desk',
    icon: '🖥️',
    roleLabel: 'Counter Staff',
    title: 'Photo Desk',
    description:
      'Scan guest wristband to view their photos. Select package — digital, print, frame or combo. Send via WhatsApp, Email or SMS instantly.',
    tag: 'photo-desk.html',
    accent: 'green',
    accessRoles: ['counter', 'admin'],
  },
  {
    id: 'card-printDash',
    path: '/print',
    href: '/print',
    icon: '🖨️',
    roleLabel: 'Print Counter',
    title: 'Print Dashboard',
    description:
      'View pending print orders queue. Mark prints as done and notify guests when their photos are ready to collect.',
    tag: 'print-dashboard.html',
    accent: 'blue',
    accessRoles: ['print', 'admin'],
  },
  {
    id: 'card-wristband',
    path: '/bulk-qr',
    href: '/bulk-qr',
    icon: '🎟️',
    roleLabel: 'Entry Gate',
    title: 'Wristband Printer',
    description:
      'Generate and print QR wristbands for guests. Auto-resets daily — fresh start every morning. Supports custom prefix and batch labelling.',
    tag: 'bulk-qr-printer.html',
    accent: 'rose',
    accessRoles: ['admin'],
  },
  {
    id: 'card-admin',
    path: '/admin',
    href: '/admin',
    icon: '📊',
    roleLabel: 'Management',
    title: 'Admin Dashboard',
    description:
      'Live revenue, guest stats and ride analytics. Manage ride names and view order history. Full overview of today\'s park operations.',
    tag: 'admin-dashboard.html',
    accent: 'violet',
    accessRoles: ['admin'],
  },
  {
    id: 'card-receipt',
    path: '/receipt',
    href: '/receipt',
    icon: '🧾',
    roleLabel: 'Billing',
    title: 'Receipt',
    description:
      'View and print customer receipts. Send via WhatsApp, Email or SMS. Search any order by Order ID.',
    tag: 'receipt.html',
    accent: 'green',
    accessRoles: ['admin'],
  },
  {
    id: 'card-report',
    path: '/reports',
    href: '/reports',
    icon: '📈',
    roleLabel: 'Finance',
    title: 'Financial Report',
    description:
      'Daily revenue report with full breakdown. Payment mode, order type, ride-wise analysis. Export to Excel for CA and audit.',
    tag: 'financial-report.html',
    accent: 'amber',
    accessRoles: ['admin'],
  },
];

const ROLE_VISIBLE_CARDS: Partial<Record<Role, PortalCardId[]>> = {
  photographer: ['card-photographer'],
  counter: ['card-photoDesk'],
  print: ['card-printDash'],
};

/** Same visibility rules as legacy index.html. */
export function isPortalCardVisible(role: Role, cardId: PortalCardId): boolean {
  if (role === 'admin') return true;
  const visible = ROLE_VISIBLE_CARDS[role] ?? [];
  return visible.includes(cardId);
}

export function moduleAccessRoles(path: string): Role[] | undefined {
  const mod = PORTAL_MODULES.find((m) => m.path === path);
  return mod?.accessRoles;
}
