import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { QRCodeData, SessionUser } from "./types";

type AppState = {
  currentUser: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  activeQRData: QRCodeData | null;
  setActiveQR: (data: QRCodeData | null) => void;
  _hasHydrated: boolean;
};

const useStore = create<AppState>()(
  persist(
    (set) => ({
      currentUser: null,
      setUser: (user) => set({ currentUser: user }),
      activeQRData: null,
      setActiveQR: (data) => set({ activeQRData: data }),
      _hasHydrated: false,
    }),
    {
      name: "spark-session",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      partialize: (state) => ({ currentUser: state.currentUser }),
      skipHydration: true,
      onRehydrateStorage: () => (state) => {
        if (state) state._hasHydrated = true;
      },
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<AppState>),
        _hasHydrated: true,
      }),
    }
  )
);

if (typeof window !== "undefined") {
  useStore.persist.rehydrate();
}

export default useStore;
