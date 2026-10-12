import { describe, expect, it } from 'vitest';

import {
  categoriesPickSchema,
  categorySchema,
  questionSchema,
  roomCodeSchema,
  roomJoinSchema,
  nicknameSchema,
} from './schemas.js';

describe('schemas de sala', () => {
  it('acepta códigos válidos y rechaza letras ambiguas o formatos incorrectos', () => {
    expect(roomCodeSchema.safeParse('ABCD').success).toBe(true);
    expect(roomCodeSchema.safeParse('XKZR').success).toBe(true);
    expect(roomCodeSchema.safeParse('ABCI').success).toBe(false); // I prohibida
    expect(roomCodeSchema.safeParse('ABCO').success).toBe(false); // O prohibida
    expect(roomCodeSchema.safeParse('abc2').success).toBe(false);
    expect(roomCodeSchema.safeParse('ABC').success).toBe(false); // corto
  });

  it('valida apodos entre 2 y 14 caracteres', () => {
    expect(nicknameSchema.safeParse('Ana').success).toBe(true);
    expect(nicknameSchema.safeParse('  Ana  ').data).toBe('Ana'); // recorta
    expect(nicknameSchema.safeParse('A').success).toBe(false);
    expect(nicknameSchema.safeParse('a'.repeat(15)).success).toBe(false);
  });

  it('valida el payload room:join', () => {
    expect(roomJoinSchema.safeParse({ code: 'ABCD', nickname: 'Ana' }).success).toBe(true);
    expect(roomJoinSchema.safeParse({ code: 'ABCO', nickname: 'Ana' }).success).toBe(false);
    expect(roomJoinSchema.safeParse({ code: 'ABCD', nickname: '' }).success).toBe(false);
  });

  it('exige exactamente 3 categorías de especialista', () => {
    expect(categoriesPickSchema.safeParse({ categoryIds: ['a', 'b', 'c'] }).success).toBe(true);
    expect(categoriesPickSchema.safeParse({ categoryIds: ['a', 'b'] }).success).toBe(false);
    expect(categoriesPickSchema.safeParse({ categoryIds: ['a', 'b', 'c', 'd'] }).success).toBe(
      false,
    );
  });
});

describe('schemas de contenido', () => {
  const baseQuestion = {
    id: 'q1',
    lang: 'es',
    categoryId: 'geografia',
    difficulty: 1,
    type: 'mcq',
    text: '¿Cuál es la capital de Perú?',
    options: ['Lima', 'Bogotá', 'Quito', 'Santiago'],
    correctIndex: 0,
    verified: true,
  };

  it('acepta una pregunta válida', () => {
    expect(questionSchema.safeParse(baseQuestion).success).toBe(true);
  });

  it('rechaza un correctIndex fuera de rango', () => {
    expect(questionSchema.safeParse({ ...baseQuestion, correctIndex: 4 }).success).toBe(false);
  });

  it('rechaza preguntas con más de 160 caracteres', () => {
    expect(questionSchema.safeParse({ ...baseQuestion, text: 'x'.repeat(161) }).success).toBe(
      false,
    );
  });

  it('valida categorías', () => {
    expect(categorySchema.safeParse({ id: 'geo', label: 'Geografía' }).success).toBe(true);
    expect(categorySchema.safeParse({ id: '', label: 'Geografía' }).success).toBe(false);
  });
});
