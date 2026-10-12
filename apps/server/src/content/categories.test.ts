import { describe, expect, it } from 'vitest';

import { loadCategories } from './categories.js';

describe('loadCategories', () => {
  it('carga las categorías reales de content/es/categories.json', async () => {
    const categories = await loadCategories();
    expect(categories.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(categories.map((category) => category.id));
    expect(ids.size).toBe(categories.length); // ids únicos
    expect(ids.has('cine-2000s')).toBe(true);
    expect(ids.has('geografia')).toBe(true);
  });

  it('devuelve un array con etiquetas no vacías', async () => {
    const categories = await loadCategories();
    for (const category of categories) {
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.id.length).toBeGreaterThan(0);
    }
  });
});
