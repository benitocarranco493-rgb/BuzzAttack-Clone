import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { categoriesArraySchema, type Category } from '@buzz/shared';

/**
 * Busca `content/es/categories.json` subiendo desde este módulo hasta la raíz
 * del repo (funcione igual si el código corre desde `src/` o desde `dist/`).
 */
async function findCategoriesFile(): Promise<string | null> {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 6; depth += 1) {
    const candidate = path.join(dir, 'content', 'es', 'categories.json');
    try {
      await access(candidate);
      return candidate;
    } catch {
      dir = path.dirname(dir);
    }
  }
  return null;
}

export interface CategoriesLogger {
  warn(message: string): void;
}

/** Carga y valida las categorías de `content/es/categories.json` (por si faltan, no rompe). */
export async function loadCategories(logger?: CategoriesLogger): Promise<Category[]> {
  try {
    const categoriesPath = await findCategoriesFile();
    if (!categoriesPath) {
      logger?.warn('No se encontró content/es/categories.json; se usarán 0 categorías.');
      return [];
    }
    const raw = await readFile(categoriesPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const result = categoriesArraySchema.safeParse(parsed);
    if (!result.success) {
      logger?.warn('content/es/categories.json no supera el esquema; se usarán 0 categorías.');
      return [];
    }
    // `exactOptionalPropertyTypes`: solo incluye opcionales presentes (sin `undefined` explícito).
    return result.data.map((category): Category => ({
      id: category.id,
      label: category.label,
      ...(category.emoji !== undefined ? { emoji: category.emoji } : {}),
      ...(category.tags !== undefined ? { tags: category.tags } : {}),
    }));
  } catch {
    logger?.warn('No se pudo cargar content/es/categories.json; se usarán 0 categorías.');
    return [];
  }
}
