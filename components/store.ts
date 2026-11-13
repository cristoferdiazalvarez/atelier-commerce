'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export type BagItem = {
  variantId: string;
  name: string;
  price: number;
  size: string;
  color: string;
  image: string;
  quantity: number;
};
type Store = {
  ownerId: string | null;
  dirty: boolean;
  items: BagItem[];
  favorites: string[];
  add: (item: BagItem) => void;
  quantity: (id: string, n: number) => void;
  clear: () => void;
  favorite: (id: string) => void;
};
export const useBag = create<Store>()(
  persist(
    (set) => ({
      ownerId: null,
      dirty: false,
      items: [],
      favorites: [],
      add: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          return {
            dirty: true,
            items: existing
              ? state.items.map((i) =>
                  i.variantId === item.variantId
                    ? { ...i, quantity: Math.min(10, i.quantity + item.quantity) }
                    : i,
                )
              : [...state.items, item],
          };
        }),
      quantity: (id, n) =>
        set((state) => ({
          dirty: true,
          items:
            n > 0
              ? state.items.map((i) =>
                  i.variantId === id
                    ? { ...i, quantity: Math.max(1, Math.min(10, Math.floor(n) || 1)) }
                    : i,
                )
              : state.items.filter((i) => i.variantId !== id),
        })),
      clear: () => set({ items: [], dirty: true }),
      favorite: (id) =>
        set((state) => ({
          dirty: true,
          favorites: state.favorites.includes(id)
            ? state.favorites.filter((x) => x !== id)
            : [...state.favorites, id],
        })),
    }),
    { name: 'atelier-bag-v1' },
  ),
);
export async function api(path: string, data: unknown) {
  const response = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'No se pudo guardar.');
  return result;
}

let pendingSync: Promise<void> = Promise.resolve();
export function enqueueSync(task: () => Promise<void>) {
  pendingSync = pendingSync.catch(() => {}).then(task);
  return pendingSync;
}
export async function flushSync() {
  await pendingSync;
}
export function clearSessionStore() {
  useBag.setState({ ownerId: null, items: [], favorites: [], dirty: false });
}
