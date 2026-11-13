'use client';
import Link from 'next/link';
import { Heart, Search, ShoppingBag, UserRound, Menu, X } from 'lucide-react';
import { useBag } from './store';
import { useSyncExternalStore, useState } from 'react';
export function Header() {
  const count = useBag((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [menu, setMenu] = useState(false);
  return (
    <>
      <div className="announcement">
        Una nueva forma de vestir. Una forma de permanecer.{' '}
        <span>Envío gratuito a partir de 250 €</span>
      </div>
      <header>
        <Link className="wordmark" href="/">
          ATELIER<span>COMMERCE</span>
        </Link>
        <nav aria-label="Navegación principal" className={menu ? 'nav open' : 'nav'}>
          <Link onClick={() => setMenu(false)} href="/catalog">
            La colección
          </Link>
          <Link onClick={() => setMenu(false)} href="/catalog?category=sastreria">
            Sastrería
          </Link>
          <Link onClick={() => setMenu(false)} href="/catalog?category=accesorios">
            Objetos
          </Link>
          <Link onClick={() => setMenu(false)} href="/policies">
            La filosofía
          </Link>
        </nav>
        <div className="header-actions">
          <Link href="/catalog" aria-label="Buscar">
            <Search size={19} />
          </Link>
          <Link href="/account?tab=favorites" aria-label="Favoritos">
            <Heart size={19} />
          </Link>
          <Link href="/account" aria-label="Mi cuenta">
            <UserRound size={19} />
          </Link>
          <Link
            className="bag-icon"
            href="/cart"
            aria-label={`Bolsa, ${ready ? count : 0} artículos`}
          >
            <ShoppingBag size={19} />
            <span>{ready ? count : 0}</span>
          </Link>
          <button
            className="mobile-menu"
            onClick={() => setMenu(!menu)}
            aria-label={menu ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menu}
          >
            {menu ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}
