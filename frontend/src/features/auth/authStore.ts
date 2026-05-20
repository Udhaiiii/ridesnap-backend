import { create } from 'zustand';
import { api } from '@/shared/api/client';
import type { ApiUser, Role } from '@/shared/types/api';

export type { Role };

export interface User extends ApiUser {}

interface AuthState {
  user: User | null;
  token: string | null;
  offline: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verify: () => Promise<User | null>;
  hydrate: () => void;
}

function cachedUser(): User | null {
  const raw = localStorage.getItem('rs_user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('rs_token'),
  offline: false,

  hydrate() {
    const token = localStorage.getItem('rs_token');
    const user = cachedUser();
    if (token && user) set({ token, user });
  },

  async login(username, password) {
    const data = await api<{
      success: boolean;
      token: string;
      user: User;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    localStorage.setItem('rs_token', data.token);
    localStorage.setItem('rs_role', data.user.role);
    localStorage.setItem('rs_name', data.user.name);
    localStorage.setItem('rs_user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, offline: false });
  },

  async logout() {
    const token = localStorage.getItem('rs_token');
    if (token) {
      await api('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }).catch(() => undefined);
    }
    localStorage.removeItem('rs_token');
    localStorage.removeItem('rs_role');
    localStorage.removeItem('rs_name');
    localStorage.removeItem('rs_user');
    set({ token: null, user: null, offline: false });
  },

  async verify() {
    const token = localStorage.getItem('rs_token');
    if (!token) return null;
    try {
      const data = await api<{ success: boolean; user: User }>('/auth/verify');
      if (!data.success) throw new Error('Invalid session');
      localStorage.setItem('rs_user', JSON.stringify(data.user));
      set({ user: data.user, token, offline: false });
      return data.user;
    } catch {
      const user = cachedUser();
      if (user && token) {
        set({ user, token, offline: true });
        return user;
      }
      localStorage.clear();
      set({ user: null, token: null, offline: false });
      return null;
    }
  },
}));
