import type { LawCard } from '@dos/shared';

export function LawCardView({
  card,
  onClick,
  selected,
  disabled,
}: {
  card: LawCard;
  onClick?: () => void;
  selected?: boolean;
  disabled?: boolean;
}) {
  const cls = `law-card law-${card.type} ${selected ? 'law-selected' : ''} ${
    onClick ? 'law-clickable' : ''
  }`;
  return (
    <button
      className={cls}
      onClick={onClick}
      disabled={disabled || !onClick}
      type="button"
    >
      <span className="law-type">
        {card.type === 'democratic' ? 'Demokratiskt' : 'Antidemokratiskt'}
      </span>
      <span className="law-title">{card.title}</span>
      <span className="law-topic">{card.topic}</span>
      <span className="law-desc">{card.description}</span>
    </button>
  );
}
