import { create } from 'zustand';
import type { AuthUser } from '@/api/auth';
import {
  loginAuth,
  logoutAuth,
  refreshAuthSession,
  registerAuth,
  updateProfileName,
  uploadAvatar,
} from '@/api/auth';

type AuthStore = {
  user: AuthUser | null;
  accessToken: string | null;
  ready: boolean;
  avatarError: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (input: {
    email: string;
    password: string;
    name: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  setAvatar: (file: File) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  clearAvatarError: () => void;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  accessToken: null,
  ready: false,
  avatarError: null,

  clearAvatarError: () => set({ avatarError: null }),

  bootstrap: async () => {
    try {
      const payload = await refreshAuthSession();
      if (payload) {
        set({ accessToken: payload.accessToken, user: payload.user });
      }
    } finally {
      set({ ready: true });
    }
  },

  login: async (email, password) => {
    const payload = await loginAuth({ email, password });
    set({
      accessToken: payload.accessToken,
      user: payload.user,
      avatarError: null,
    });
  },

  register: async (input) => {
    const payload = await registerAuth(input);
    set({
      accessToken: payload.accessToken,
      user: payload.user,
      avatarError: null,
    });
  },

  logout: async () => {
    const token = get().accessToken;
    if (token) {
      try {
        await logoutAuth(token);
      } catch {
        /* 쿠키·서버 정리는 최선 effort */
      }
    }
    set({ accessToken: null, user: null, avatarError: null });
  },

  setAvatar: async (file) => {
    const token = get().accessToken;
    if (!token) throw new Error('로그인이 필요합니다.');
    try {
      const next = await uploadAvatar(token, file);
      set({ user: next, avatarError: null });
    } catch (e) {
      const msg =
        e instanceof Error ? e.message : '이미지 업로드에 실패했습니다.';
      set({ avatarError: msg });
      throw e;
    }
  },

  updateName: async (name) => {
    const token = get().accessToken;
    if (!token) throw new Error('로그인이 필요합니다.');
    const user = await updateProfileName(token, name);
    set({ user });
  },
}));
