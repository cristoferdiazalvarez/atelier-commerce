import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="empty">
      <p className="eyebrow">404 · FUERA DE COLECCIÓN</p>
      <h1>
        El camino hacia
        <br />
        <em>algo nuevo.</em>
      </h1>
      <p>Esta página no forma parte de nuestro archivo.</p>
      <Link href="/catalog" className="button">
        Volver a la colección →
      </Link>
    </section>
  );
}
