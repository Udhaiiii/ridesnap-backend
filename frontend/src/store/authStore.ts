import { create } from 'zustand';
import { api } from '@/lib/api';

export type Role = 'admin' | 'photographer' | 'counter' | 'print';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verify: () => Promise<User | null>;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('rs_token'),

  hydrate() {
    const token = localStorage.getItem('rs_token');
    const userRaw = localStorage.getItem('rs_user');
    if (token && userRaw) {
      try {
        set({ token, user: JSON.parse(userRaw) as User });
      } catch {
        /* ignore */
      }
    }
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
    set({ token: data.token, user: data.user });
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
    set({ token: null, user: null });
  },

  async verify() {
    const token = localStorage.getItem('rs_token');
    if (!token) return null;
    try {
      const data = await api<{ success: boolean; user: User }>('/auth/verify');
      if (!data.success) throw new Error('Invalid session');
      localStorage.setItem('rs_user', JSON.stringify(data.user));
      set({ user: data.user, token });
      return data.user;
    } catch {
      localStorage.clear();
      set({ user: null, token: null });
      return null;
    }
  },
}));
