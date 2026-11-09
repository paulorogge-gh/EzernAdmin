import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { BusyLabel } from '../components/ui/Processing';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotifyContext';
import { APP } from '../lib/httpSurface';

export function LoginPage() {
  const { login, user } = useAuth();
  const { notify } = useNotify();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={APP.home} replace />;

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      navigate(APP.home);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <aside className="auth-card__brand">
          <p className="auth-card__eyebrow">Ezern</p>
          <h1>Administrator</h1>
          <p className="auth-card__lead">
            Acesso seguro ao painel. Autenticação e gestão de usuários em um fluxo direto.
          </p>
        </aside>

        <form onSubmit={onSubmit} className="auth-card__form">
          <div>
            <h2 className="auth-card__title">Entrar</h2>
            <p className="auth-card__desc">Informe suas credenciais de acesso.</p>
          </div>

          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
          <TextField
            label="Senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" className="is-full" disabled={loading}>
            <BusyLabel active={loading} idle="Entrar" />
          </Button>

          <Link to={APP.forgotPassword} className="auth-link">
            Esqueci minha senha
          </Link>
        </form>
      </div>
    </div>
  );
}
