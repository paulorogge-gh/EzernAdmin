import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/Field';
import { BusyLabel } from '../components/ui/Processing';
import { api, setAccessToken } from '../lib/api';
import { API, APP } from '../lib/httpSurface';
import { takeUrlToken } from '../lib/urlToken';
import { useAuth } from '../contexts/AuthContext';
import { useNotify } from '../contexts/NotifyContext';

export function ForgotPasswordPage() {
  const { notify } = useNotify();
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await api(API.passwordForgot, {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      setDone(true);
      notify('Se o e-mail existir, enviamos as instruções.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthMini title="Recuperar senha">
      {done ? (
        <p className="text-sm text-muted">
          Se o e-mail estiver cadastrado, você receberá as instruções em breve.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="stack-tight">
          <TextField
            label="E-mail"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={loading}>
            <BusyLabel active={loading} idle="Enviar link" />
          </Button>
        </form>
      )}
      <BackToLogin />
    </AuthMini>
  );
}

export function ResetPasswordPage() {
  const { notify } = useNotify();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [token] = useState(() => takeUrlToken());

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await api(API.passwordReset, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
      notify('Senha atualizada.', 'success');
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthMini title="Nova senha">
      {!token ? (
        <p className="text-sm text-muted">Link inválido ou incompleto. Solicite uma nova recuperação.</p>
      ) : done ? (
        <p className="text-sm">
          Senha atualizada. <Link to={APP.login}>Entrar</Link>
        </p>
      ) : (
        <form onSubmit={onSubmit} className="stack-tight">
          <TextField
            label="Nova senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            hint="Mínimo de 12 caracteres"
          />
          <Button type="submit" disabled={loading}>
            <BusyLabel active={loading} idle="Salvar senha" />
          </Button>
        </form>
      )}
      <BackToLogin />
    </AuthMini>
  );
}

export function AcceptInvitePage() {
  const { notify } = useNotify();
  const { refreshMe } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [token] = useState(() => takeUrlToken());

  async function onSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      const data = await api(API.inviteAccept, {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      setAccessToken(data.accessToken);
      await refreshMe();
      notify('Convite aceito.', 'success');
      navigate(APP.home);
    } catch (err) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthMini title="Aceitar convite">
      {!token ? (
        <p className="text-sm text-muted">Link de convite inválido ou incompleto.</p>
      ) : (
        <form onSubmit={onSubmit} className="stack-tight">
          <TextField
            label="Definir senha"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={12}
            hint="Mínimo de 12 caracteres"
          />
          <Button type="submit" disabled={loading}>
            <BusyLabel active={loading} idle="Ativar conta" />
          </Button>
        </form>
      )}
      <BackToLogin />
    </AuthMini>
  );
}

function AuthMini({ title, children }) {
  return (
    <div className="auth-shell">
      <div className="auth-mini">
        <h1 className="auth-mini__title">{title}</h1>
        <div className="auth-mini__body">{children}</div>
      </div>
    </div>
  );
}

function BackToLogin() {
  return (
    <Link to={APP.login} className="auth-link">
      Voltar ao login
    </Link>
  );
}
