/**
 * Valida el contenido (preguntas y categorías) con los esquemas Zod de @buzz/shared.
 * Se ampliará en la Fase 6 (mínimos por categoría/dificultad, unicidad global, etc.).
 * En este momento ya comprueba: esquema, IDs únicos, opciones únicas y mínimos
 * por categoría y dificultad (d1 ≥ 10, d2 ≥ 8, d3 ≥ 6).
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { categoriesArraySchema, questionsArraySchema, type ParsedQuestion } from '@buzz/shared';

const contentRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../content');
const esQuestionsDir = path.join(contentRoot, 'es', 'questions');
const categoriesFile = path.join(contentRoot, 'es', 'categories.json');

/** Mínimos de preguntas por dificultad y categoría (MVP, §13.1). */
const MIN_PER_DIFFICULTY: Record<1 | 2 | 3, number> = { 1: 10, 2: 8, 3: 6 };

function formatZodError(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  return error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('; ');
}

async function isDirectory(dir: string): Promise<boolean> {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

async function validateCategories(messages: string[]): Promise<void> {
  try {
    const raw = await readFile(categoriesFile, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const result = categoriesArraySchema.safeParse(parsed);
    if (!result.success) {
      messages.push(`categories.json inválido: ${formatZodError(result.error)}`);
    }
  } catch {
    console.warn(
      `No existe ${path.relative(process.cwd(), categoriesFile)}; no se validan categorías (se creará en la Fase 6).`,
    );
  }
}

async function validateQuestionFiles(messages: string[]): Promise<void> {
  if (!(await isDirectory(esQuestionsDir))) {
    console.warn(
      `No existe ${path.relative(process.cwd(), esQuestionsDir)}; no se validan preguntas (se creará en la Fase 6).`,
    );
    return;
  }

  const allQuestions: ParsedQuestion[] = [];
  const files = (await readdir(esQuestionsDir)).filter((file) => file.endsWith('.json'));

  const seenIds = new Set<string>();
  for (const file of files.sort()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await readFile(path.join(esQuestionsDir, file), 'utf8')) as unknown;
    } catch {
      messages.push(`${file}: JSON con sintaxis inválida`);
      continue;
    }
    const result = questionsArraySchema.safeParse(parsed);
    if (!result.success) {
      messages.push(`${file}: esquema inválido (${formatZodError(result.error)})`);
      continue;
    }
    for (const question of result.data) {
      if (seenIds.has(question.id)) {
        messages.push(`ID de pregunta duplicado en la partida: ${question.id} (${file})`);
      }
      seenIds.add(question.id);
      if (new Set(question.options).size !== 4) {
        messages.push(`${question.id}: las 4 opciones deben ser únicas`);
      }
    }
    allQuestions.push(...result.data);
  }

  if (files.length === 0) {
    messages.push(
      `No hay archivos de preguntas en ${path.relative(process.cwd(), esQuestionsDir)}`,
    );
  }

  const esQuestions = allQuestions.filter((question) => question.lang === 'es');
  const byCategory = new Map<string, Record<1 | 2 | 3, number>>();
  for (const question of esQuestions) {
    const counts = byCategory.get(question.categoryId) ?? { 1: 0, 2: 0, 3: 0 };
    counts[question.difficulty] += 1;
    byCategory.set(question.categoryId, counts);
  }
  for (const [categoryId, counts] of byCategory) {
    for (const [difficulty, min] of Object.entries(MIN_PER_DIFFICULTY) as [string, number][]) {
      const count = counts[Number(difficulty) as 1 | 2 | 3];
      if (count < min) {
        messages.push(
          `Categoría ${categoryId}: dificultad ${difficulty}: ${count} preguntas (< ${min})`,
        );
      }
    }
  }
}

async function main(): Promise<void> {
  const messages: string[] = [];
  await validateCategories(messages);
  await validateQuestionFiles(messages);

  if (messages.length > 0) {
    console.error(`❌ validate-content: ${messages.length} problema(s)`);
    for (const message of messages) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }
  console.log('✅ validate-content: contenido válido');
}

void main();
