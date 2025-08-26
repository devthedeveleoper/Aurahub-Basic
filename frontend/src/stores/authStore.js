import { create } from "zustand";

const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ isAuthenticated: true, user }),
  clearUser: () => set({ isAuthenticated: false, user: null }),
}));

export default useAuthStore;
