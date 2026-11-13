'use client';
/* eslint-disable @next/next/no-img-element */
import { useSyncExternalStore, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useBag, api, flushSync } from './store';
import { money, totals } from '@/lib/money';
import type { Address, Setting } from '@prisma/client';
export function Cart({
  settings,
  signedIn,
  stripeReady,
  demo,
  addresses,
}: {
  settings: Setting;
  signedIn: boolean;
  stripeReady: boolean;
  demo: boolean;
  addresses: Address[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const items = useBag((s) => s.items),
    quantity = useBag((s) => s.quantity),
    clear = useBag((s) => s.clear);
  const ready = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [coupon, setCoupon] = useState('');
  const estimate = totals(
    items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    0,
    settings.taxBps,
    settings.shipping,
    settings.freeShippingAt,
  );
  const [quoted, setQuoted] = useState<{
    fingerprint: string;
    amount: ReturnType<typeof totals>;
  } | null>(null);
  const [quoteError, setQuoteError] = useState<{ fingerprint: string; message: string } | null>(
    null,
  );
  const quoteFingerprint = JSON.stringify({
    items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
    coupon,
  });
  useEffect(() => {
    if (!signedIn || !items.length) return;
    let active = true;
    const timer = setTimeout(() => {
      void api('quote', JSON.parse(quoteFingerprint))
        .then((result) => {
          if (active) {
            setQuoted({ fingerprint: quoteFingerprint, amount: result });
            setQuoteError(null);
          }
        })
        .catch((err) => {
          if (active)
            setQuoteError({
              fingerprint: quoteFingerprint,
              message: err instanceof Error ? err.message : 'No se pudo calcular el total.',
            });
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [quoteFingerprint, signedIn, items.length]);
  const amount = quoted?.fingerprint === quoteFingerprint ? quoted.amount : estimate;
  const quoteReady =
    quoted?.fingerprint === quoteFingerprint && quoteError?.fingerprint !== quoteFingerprint;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = new FormData(e.currentTarget);
      const fingerprint = JSON.stringify({
        items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        address: Object.fromEntries(
          ['name', 'line1', 'city', 'postalCode', 'country'].map((k) => [k, data.get(k)]),
        ),
        coupon,
        mode: data.get('mode'),
      });
      let key = sessionStorage.getItem('atelier-checkout-key');
      if (sessionStorage.getItem('atelier-checkout-fingerprint') !== fingerprint || !key) {
        key = crypto.randomUUID();
        sessionStorage.setItem('atelier-checkout-key', key);
        sessionStorage.setItem('atelier-checkout-fingerprint', fingerprint);
      }
      await flushSync();
      const result = await api('checkout', { ...JSON.parse(fingerprint), key });
      if (!result.url) throw new Error('La sesión de pago no está disponible.');
      if (result.url.startsWith('/')) {
        clear();
        sessionStorage.removeItem('atelier-checkout-key');
      }
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de checkout');
      setBusy(false);
    }
  }
  if (!ready) return <p className="empty">Preparando tu bolsa…</p>;
  if (!items.length)
    return (
      <div className="empty">
        <h1>
          Tu bolsa, <em>un comienzo.</em>
        </h1>
        <p>Las buenas elecciones empiezan aquí.</p>
        <Link className="button" href="/catalog">
          Descubrir la colección
        </Link>
      </div>
    );
  return (
    <>
      <div className="section-heading">
        <h1>
          Tu <em>bolsa.</em>
        </h1>
        <span>{items.length} piezas seleccionadas</span>
      </div>
      <div className="cart-layout">
        <div>
          {items.map((i) => (
            <article className="cart-line" key={i.variantId}>
              <img src={i.image} alt={i.name} />
              <div>
                <h2>{i.name}</h2>
                <p>
                  {i.color} / {i.size}
                </p>
                <p>{money(i.price)}</p>
                <label>
                  Cantidad{' '}
                  <input
                    aria-label={`Cantidad de ${i.name}`}
                    type="number"
                    min="0"
                    max="10"
                    value={i.quantity}
                    onChange={(e) => quantity(i.variantId, Number(e.target.value))}
                  />
                </label>
                <button className="text-link" onClick={() => quantity(i.variantId, 0)}>
                  Eliminar
                </button>
              </div>
              <strong>{money(i.price * i.quantity)}</strong>
            </article>
          ))}
        </div>
        <aside className="checkout-panel">
          <h2>Los detalles.</h2>
          <dl>
            <div>
              <dt>Subtotal</dt>
              <dd>{money(amount.subtotal)}</dd>
            </div>
            {amount.discount > 0 && (
              <div>
                <dt>Descuento</dt>
                <dd>−{money(amount.discount)}</dd>
              </div>
            )}
            <div>
              <dt>Impuestos ({settings.taxBps / 100} %)</dt>
              <dd>{money(amount.tax)}</dd>
            </div>
            <div>
              <dt>Envío demo</dt>
              <dd>{amount.shipping ? money(amount.shipping) : 'Incluido'}</dd>
            </div>
            <div className="total">
              <dt>{quoteReady ? 'Total validado' : 'Total estimado'}</dt>
              <dd>{money(amount.total)}</dd>
            </div>
          </dl>
          <p className="muted">
            Precios y descuentos se validan en servidor al crear el pedido. Cupón de prueba:
            WELCOME10.
          </p>
          {!signedIn ? (
            <>
              <p>Inicia sesión para guardar tu pedido.</p>
              <Link className="button wide" href="/account">
                Entrar o crear cuenta
              </Link>
            </>
          ) : (
            <form ref={formRef} onSubmit={submit} className="stack">
              <h3>Dirección de demostración</h3>
              {addresses.length > 0 && (
                <label>
                  Usar dirección guardada
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const address = addresses.find((a) => a.id === e.target.value);
                      if (!address || !formRef.current) return;
                      for (const key of [
                        'name',
                        'line1',
                        'city',
                        'postalCode',
                        'country',
                      ] as const) {
                        const input = formRef.current.elements.namedItem(key);
                        if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement)
                          input.value = address[key];
                      }
                    }}
                  >
                    <option value="">Introducir otra dirección</option>
                    {addresses.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.line1} · {a.city}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Nombre
                <input
                  name="name"
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder="Cliente de prueba"
                />
              </label>
              <label>
                Dirección
                <input
                  name="line1"
                  required
                  minLength={3}
                  autoComplete="street-address"
                  placeholder="Calle Ejemplo, 10"
                />
              </label>
              <div className="form-row">
                <label>
                  Ciudad
                  <input name="city" required minLength={2} autoComplete="address-level2" />
                </label>
                <label>
                  Código postal
                  <input name="postalCode" required minLength={3} autoComplete="postal-code" />
                </label>
              </div>
              <label>
                País
                <select name="country">
                  <option value="ES">España</option>
                  <option value="PT">Portugal</option>
                  <option value="FR">Francia</option>
                </select>
              </label>
              <label>
                Cupón
                <input
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value)}
                  placeholder="WELCOME10"
                />
              </label>
              <label>
                Modo de checkout
                <select name="mode">
                  {demo && <option value="demo">Demo · Sin tarjeta ni cobro</option>}
                  {stripeReady && <option value="stripe">Stripe TEST · Tarjeta de prueba</option>}
                </select>
              </label>
              <p className="demo-note">PROYECTO DEMO · No se realizarán cobros ni envíos reales.</p>
              {quoteError?.fingerprint === quoteFingerprint && (
                <p className="error" role="alert">
                  {quoteError.message}
                </p>
              )}
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="button wide"
                disabled={busy || !quoteReady || (!demo && !stripeReady)}
              >
                {busy ? 'Validando inventario…' : 'Crear pedido de prueba →'}
              </button>
            </form>
          )}
        </aside>
      </div>
    </>
  );
}
