'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, flushSync, clearSessionStore } from './store';
export function ActionForm({
  endpoint,
  children,
  button = 'Guardar',
  transform,
}: {
  endpoint: string;
  children: React.ReactNode;
  button?: string;
  transform?: 'numeric';
}) {
  const router = useRouter();
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        const form = e.currentTarget;
        const data: Record<string, unknown> = Object.fromEntries(new FormData(form));
        if (transform === 'numeric') {
          for (const key of [
            'price',
            'delta',
            'percent',
            'taxBps',
            'shipping',
            'freeShippingAt',
            'position',
          ])
            if (key in data) data[key] = Number(data[key]);
          for (const key of ['active', 'featured'])
            if (key in data) data[key] = data[key] === 'true';
        }
        try {
          if (endpoint === 'auth/logout') await flushSync().catch(() => {});
          const result = await api(endpoint, data);
          if (endpoint === 'auth/logout') clearSessionStore();
          setMessage(result.message || 'Guardado.');
          router.refresh();
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'No se pudo guardar.');
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="button" disabled={busy}>
        {busy ? 'Procesando…' : button}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
export function AuthForm({ reset, demoLogin = false }: { reset?: string; demoLogin?: boolean }) {
  const [mode, setMode] = useState(reset ? 'reset' : 'login');
  return (
    <div className="auth-card">
      <p className="eyebrow">BIENVENIDO A ATELIER</p>
      <h1>
        Tu espacio.
        <br />
        <em>Tu perspectiva.</em>
      </h1>
      <div className="tabs">
        <button aria-pressed={mode === 'login'} onClick={() => setMode('login')}>
          Entrar
        </button>
        <button aria-pressed={mode === 'register'} onClick={() => setMode('register')}>
          Crear cuenta
        </button>
      </div>
      <ActionForm
        endpoint={`auth/${mode}`}
        button={
          mode === 'register'
            ? 'Crear cuenta'
            : mode === 'recover'
              ? 'Solicitar enlace'
              : mode === 'reset'
                ? 'Cambiar contraseña'
                : 'Iniciar sesión'
        }
      >
        {mode === 'register' && (
          <label>
            Nombre
            <input required name="name" minLength={2} autoComplete="name" />
          </label>
        )}
        {mode !== 'reset' && (
          <label>
            Email
            <input required name="email" type="email" autoComplete="email" />
          </label>
        )}
        {mode !== 'recover' && (
          <label>
            Contraseña
            <input
              required
              name="password"
              type="password"
              minLength={10}
              maxLength={72}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
        )}
        {mode === 'reset' && <input type="hidden" name="token" value={reset} />}
      </ActionForm>
      <button className="text-link" onClick={() => setMode('recover')}>
        Recuperar contraseña
      </button>
      {demoLogin && (
        <ActionForm endpoint="auth/demo" button="Explorar con una cuenta demo">
          <p>Crea un espacio de cliente privado sin compartir pedidos con otros visitantes.</p>
        </ActionForm>
      )}
      <p className="muted">
        Entorno de prueba. Utiliza datos ficticios y una contraseña de al menos 10 caracteres.
      </p>
    </div>
  );
}
