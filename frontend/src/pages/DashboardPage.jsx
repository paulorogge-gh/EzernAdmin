import { IconBuilding, IconUsers } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import { PageGrid, PageHeader } from '../components/ui/Page';
import { useAuth } from '../contexts/AuthContext';
import { APP } from '../lib/httpSurface';

export function DashboardPage() {
  const { user, isOwnerOrAdmin } = useAuth();

  return (
    <div>
      <PageHeader
        title="Painel"
        description={`Olá, ${user?.name}. Aqui você acompanha o essencial da operação.`}
      />

      <PageGrid cols={2}>
        <article className="metric-card anim-fade-up anim-delay-1">
          <span className="metric-card__icon" aria-hidden>
            <IconBuilding size={18} stroke={1.75} />
          </span>
          <h2>Organização</h2>
          <p>{user?.organization?.name || 'Ezern'}</p>
        </article>

        {isOwnerOrAdmin ? (
          <Link to={APP.members} className="metric-card anim-fade-up anim-delay-2">
            <span className="metric-card__icon" aria-hidden>
              <IconUsers size={18} stroke={1.75} />
            </span>
            <h2>Usuários</h2>
            <p>Convidar, editar, desativar e reenviar convites com poucos cliques.</p>
          </Link>
        ) : (
          <article className="metric-card anim-fade-up anim-delay-2">
            <span className="metric-card__icon" aria-hidden>
              <IconUsers size={18} stroke={1.75} />
            </span>
            <h2>Seu acesso</h2>
            <p>Perfil {user?.role}. A gestão de usuários fica com OWNER e ADMIN.</p>
          </article>
        )}
      </PageGrid>
    </div>
  );
}
