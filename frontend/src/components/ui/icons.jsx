import {
  IconAlertTriangle,
  IconBolt,
  IconBriefcase,
  IconBuildingBank,
  IconCreditCard,
  IconHome,
  IconPercentage,
  IconPlus,
  IconSparkles,
  IconTag,
  IconTruck,
  IconUsers,
  IconWallet,
} from '@tabler/icons-react';

/** Chaves do catálogo (backend) → ícones Tabler. */
export const catalogIconMap = {
  bank: IconBuildingBank,
  wallet: IconWallet,
  card: IconCreditCard,
  'card-credit': IconCreditCard,
  briefcase: IconBriefcase,
  tag: IconTag,
  home: IconHome,
  spark: IconSparkles,
  alert: IconAlertTriangle,
  percent: IconPercentage,
  plus: IconPlus,
  users: IconUsers,
  truck: IconTruck,
  bolt: IconBolt,
};

export const CATALOG_ICON_OPTIONS = [
  { value: 'tag', label: 'Etiqueta' },
  { value: 'briefcase', label: 'Negócios' },
  { value: 'wallet', label: 'Carteira' },
  { value: 'bank', label: 'Banco' },
  { value: 'card', label: 'Cartão' },
  { value: 'home', label: 'Casa' },
  { value: 'users', label: 'Pessoas' },
  { value: 'truck', label: 'Fornecedor' },
  { value: 'percent', label: 'Percentual' },
  { value: 'bolt', label: 'Utilidades' },
  { value: 'spark', label: 'Destaque' },
  { value: 'alert', label: 'Alerta' },
  { value: 'plus', label: 'Mais' },
];

const fallbackIcon = IconTag;

/** Resolve `icon_key` / `iconKey` do catálogo para um ícone Tabler. */
export function AppIcon({ name, size = 18, stroke = 1.75, ...props }) {
  const Comp = (name && catalogIconMap[name]) || fallbackIcon;
  return <Comp size={size} stroke={stroke} aria-hidden {...props} />;
}

export function resolveCatalogIcon(name) {
  if (name && catalogIconMap[name]) return catalogIconMap[name];
  return fallbackIcon;
}

/** Chip de categoria: fundo tintado + ícone na cor. */
export function CategoryGlyph({ iconKey, color, size = 16, className = '' }) {
  const tone = color || '#0f9f90';
  return (
    <span
      className={`category-glyph ${className}`.trim()}
      style={{
        background: `color-mix(in srgb, ${tone} 18%, transparent)`,
        color: tone,
      }}
      aria-hidden
    >
      <AppIcon name={iconKey || 'tag'} size={size} />
    </span>
  );
}
