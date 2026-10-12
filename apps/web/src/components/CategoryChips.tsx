import type { Category } from '@buzz/shared';

export interface CategoryChipsProps {
  categories: readonly Category[];
  /** Selección interactiva; si se omite, los chips son de solo lectura. */
  selectedIds?: readonly string[];
  onToggle?: (categoryId: string) => void;
}

/** Chips de categorías con emoji + etiqueta (color nunca es la única señal). */
export function CategoryChips({ categories, selectedIds, onToggle }: CategoryChipsProps) {
  return (
    <ul className="category-chips">
      {categories.map((category) => {
        const selected = selectedIds?.includes(category.id) ?? false;
        if (!onToggle) {
          return (
            <li key={category.id} className="category-chip">
              {category.emoji ? <span aria-hidden="true">{category.emoji}</span> : null}
              {category.label}
            </li>
          );
        }
        return (
          <li key={category.id}>
            <button
              type="button"
              className={`category-chip category-chip--button${selected ? ' category-chip--selected' : ''}`}
              aria-pressed={selected}
              onClick={() => {
                onToggle(category.id);
              }}
            >
              {category.emoji ? <span aria-hidden="true">{category.emoji}</span> : null}
              {category.label}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
