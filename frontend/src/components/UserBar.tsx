import { useAuthStore } from '@/store/authStore';

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
    <div className="user-bar">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <span style={{ color: '#fbbf24' }}>📸 RideSnap</span>
        <span>·</span>
        <span>{pageName}</span>
      </div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        <span>{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</span>
        <span style={{ color: '#aaa' }}>{user?.name}</span>
        <button type="button" className="btn-ghost" onClick={() => void logout()}>
          Logout
        </button>
      </div>
    </div>
  );
}
