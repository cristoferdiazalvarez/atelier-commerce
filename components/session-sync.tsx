'use client';
import { useEffect, useState } from 'react';
import { useBag, api, enqueueSync, clearSessionStore, type BagItem } from './store';
type RemoteState = { items: BagItem[]; favorites: string[] };
export function SessionSync({ userId }: { userId: string | null }) {
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const save = () => {
      const snapshot = useBag.getState();
      if (snapshot.ownerId !== userId || !snapshot.dirty) return;
      return enqueueSync(async () => {
        if (!active || useBag.getState().ownerId !== userId) return;
        try {
          await api('sync', {
            items: snapshot.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
            favorites: snapshot.favorites,
          });
          const latest = useBag.getState();
          if (latest.items === snapshot.items && latest.favorites === snapshot.favorites)
            useBag.setState({ dirty: false });
          if (active) setError('');
        } catch (err) {
          if (active)
            setError(err instanceof Error ? err.message : 'No se pudo sincronizar tu cuenta.');
          throw err;
        }
      });
    };
    void Promise.resolve()
      .then(async () => {
        if (!active) return;
        if (!userId) {
          if (useBag.getState().ownerId) clearSessionStore();
          return;
        }
        const response = await fetch('/api/sync', { cache: 'no-store' });
        if (!response.ok) throw new Error('No se pudo sincronizar tu cuenta.');
        const data: RemoteState = await response.json();
        if (!active) return;
        const local = useBag.getState();
        if (local.ownerId === null) {
          const items = [
            ...local.items,
            ...data.items.filter((i) => !local.items.some((l) => l.variantId === i.variantId)),
          ].slice(0, 30);
          useBag.setState({
            ownerId: userId,
            items,
            favorites: [...new Set([...local.favorites, ...data.favorites])].slice(0, 100),
            dirty: true,
          });
        } else if (local.ownerId !== userId || !local.dirty) {
          useBag.setState({
            ownerId: userId,
            items: data.items,
            favorites: data.favorites,
            dirty: false,
          });
        }
        unsubscribe = useBag.subscribe((state, previous) => {
          if (state.items !== previous.items || state.favorites !== previous.favorites)
            void save()?.catch(() => {});
        });
        await save();
      })
      .catch((err) => {
        if (active)
          setError(err instanceof Error ? err.message : 'No se pudo sincronizar tu cuenta.');
      });
    const reconnect = () => {
      void save()?.catch(() => {});
    };
    window.addEventListener('online', reconnect);
    return () => {
      active = false;
      unsubscribe?.();
      window.removeEventListener('online', reconnect);
    };
  }, [userId]);
  return error ? (
    <p className="sync-notice" role="status">
      {error} Tus cambios siguen guardados en este dispositivo.
    </p>
  ) : null;
}
