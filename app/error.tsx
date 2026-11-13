'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="empty">
      <h1>
        Un momento de <em>pausa.</em>
      </h1>
      <p>No hemos podido cargar este espacio. Comprueba que PostgreSQL esté disponible.</p>
      <button className="button" onClick={reset}>
        Volver a intentar
      </button>
    </section>
  );
}
