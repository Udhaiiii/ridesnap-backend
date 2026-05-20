import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, offline: false });
  });

  it('hydrates from localStorage', () => {
    localStorage.setItem('rs_token', 'tok');
    localStorage.setItem(
      'rs_user',
      JSON.stringify({ id: '1', name: 'A', username: 'a', role: 'admin' }),
    );
    useAuthStore.getState().hydrate();
    expect(useAuthStore.getState().token).toBe('tok');
    expect(useAuthStore.getState().user?.username).toBe('a');
  });

  it('clears state on logout without token', async () => {
    useAuthStore.setState({
      token: 'x',
      user: { id: '1', name: 'A', username: 'a', role: 'admin' },
    });
    await useAuthStore.getState().logout();
    expect(useAuthStore.getState().token).toBeNull();
    expect(localStorage.getItem('rs_token')).toBeNull();
  });
});
