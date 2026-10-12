import { describe, expect, it } from 'vitest';

import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';
import { generateRoomCode } from './roomCode.js';

/** RNG determinista (LCG) para que los tests sean reproducibles. */
function seededRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return state / 0x100000000;
  };
}

describe('generateRoomCode', () => {
  it('genera códigos con la longitud y el alfabeto seguro', () => {
    for (let seed = 0; seed < 100; seed++) {
      const code = generateRoomCode(seededRng(seed));
      expect(code).toHaveLength(ROOM_CODE_LENGTH);
      for (const char of code) {
        expect(ROOM_CODE_ALPHABET).toContain(char);
      }
    }
  });

  it('es determinista con el mismo RNG', () => {
    expect(generateRoomCode(seededRng(42))).toBe(generateRoomCode(seededRng(42)));
  });
});
