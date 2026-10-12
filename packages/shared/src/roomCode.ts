import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from './constants.js';

/**
 * Devuelve un código de sala legible (ROOM_CODE_LENGTH letras sin I/O/0/1).
 * `random` es inyectable para que los tests sean deterministas.
 */
export function generateRoomCode(random: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    const index = Math.floor(random() * ROOM_CODE_ALPHABET.length);
    code += ROOM_CODE_ALPHABET.charAt(index);
  }
  return code;
}
