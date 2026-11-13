import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import './globals.css';
import { currentUser } from '@/lib/auth';
import { SessionSync } from '@/components/session-sync';
export const metadata: Metadata = {
  title: { default: 'ATELIER — The Considered Wardrobe', template: '%s · ATELIER' },
  description:
    'Un guardarropa consciente. Moda editorial y diseño atemporal. Proyecto de portfolio: tienda de demostración sin pagos reales.',
};
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="es">
      <body>
        <a className="skip" href="#main">
          Saltar al contenido
        </a>
        <Header />
        <SessionSync userId={user?.id || null} />
        <main id="main">{children}</main>
        <footer>
          <div className="footer-top">
            <div className="footer-brand">
              ATELIER
              <p>
                Piezas que permanecen.
                <br />
                Una perspectiva diferente.
              </p>
            </div>
            <div>
              <h3>Explorar</h3>
              <Link href="/catalog">La colección</Link>
              <Link href="/account">Mi cuenta</Link>
              <Link href="/cart">Tu bolsa</Link>
            </div>
            <div>
              <h3>Información</h3>
              <Link href="/policies#shipping">Envíos y devoluciones</Link>
              <Link href="/policies#privacy">Privacidad</Link>
              <Link href="/policies">Sobre el proyecto</Link>
            </div>
            <div className="footer-note">
              <span>DISEÑADO PARA PERMANECER</span>
              <p>
                Menos, pero con intención.
                <br />
                El valor está en los detalles.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} ATELIER COMMERCE</span>
            <span>Portfolio demo · Sin ventas ni pagos reales</span>
            <span>EUR € / ES</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
