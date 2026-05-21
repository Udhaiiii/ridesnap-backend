import { useAuthStore } from '@/features/auth/authStore';

const ROLE_LABELS: Record<string, string> = {
  admin: '👑 Admin',
  photographer: '📷 Photographer',
  counter: '🖥️ Counter Staff',
  print: '🖨️ Print Staff',
};

interface Props {
  pageName: string;
}

export function UserBar({ pageName }: Props) {
  const { user, logout } = useAuthStore();
  return (
    <div className="user-bar no-print">
      <div className="flex items-center gap-3">
        <span className="text-rs-amber">📸 RideSnap</span>
        <span>·</span>
        <span>{pageName}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span>
        <span className="text-[#aaa]">{user?.name}</span>
        <button type="button" className="btn-ghost" onClick={() => void logout()}>
          Logout
        </button>
      </div>
    </div>
  );
}
