import { z } from 'zod';

// ---------------------------------------------------------------------------
// Identidad y sala
// ---------------------------------------------------------------------------

export const roomCodeSchema = z
  .string()
  .regex(/^[A-HJ-NP-Z]{4}$/, 'Código: 4 letras de la A a la Z sin I ni O');

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, 'El apodo debe tener al menos 2 caracteres')
  .max(14, 'El apodo no puede superar los 14 caracteres');

export const playerTokenSchema = z.string().min(1);

// ---------------------------------------------------------------------------
// Preguntas y categorías (contenido validado con Zod)
// ---------------------------------------------------------------------------

export const langSchema = z.enum(['es', 'en']);
export const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);
export const correctIndexSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
export const questionSourceSchema = z.enum(['manual', 'opentdb', 'llm']);

export const questionMediaSchema = z.object({
  kind: z.enum(['image', 'audio']),
  src: z.string().min(1),
});

export const questionSchema = z.object({
  id: z.string().min(1),
  lang: langSchema,
  categoryId: z.string().min(1),
  difficulty: difficultySchema,
  type: z.literal('mcq'),
  text: z.string().min(1).max(160, 'Máx. 160 caracteres'),
  options: z.tuple([
    z.string().min(1).max(80),
    z.string().min(1).max(80),
    z.string().min(1).max(80),
    z.string().min(1).max(80),
  ]),
  correctIndex: correctIndexSchema,
  explanation: z.string().max(300).optional(),
  source: questionSourceSchema.optional(),
  verified: z.boolean(),
  media: questionMediaSchema.optional(),
});

export const questionsArraySchema = z.array(questionSchema);

/** Tipo de una pregunta ya validada (equivalente a `Question`, sin re-stringir opcionales). */
export type ParsedQuestion = z.infer<typeof questionSchema>;

export const categorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  emoji: z.string().max(8).optional(),
  tags: z.array(z.string().min(1)).optional(),
});

export const categoriesArraySchema = z.array(categorySchema);

/** Prompts de Read the Room (sin respuesta correcta). */
export const readTheRoomPromptSchema = z.object({
  id: z.string().min(1),
  lang: langSchema,
  text: z.string().min(1).max(160),
  options: z.array(z.string().min(1).max(80)).min(4).max(6),
});

// ---------------------------------------------------------------------------
// Payloads entrantes de Socket.IO (deben validarse siempre en el servidor)
// ---------------------------------------------------------------------------

export const roomCreateSchema = z.object({
  config: z.record(z.string(), z.unknown()).optional(),
});

export const roomJoinSchema = z.object({
  code: roomCodeSchema,
  nickname: nicknameSchema,
});

export const roomRejoinSchema = z.object({
  code: roomCodeSchema,
  playerToken: playerTokenSchema,
});

export const hostRejoinSchema = z.object({
  code: roomCodeSchema,
  hostToken: playerTokenSchema,
});

export const teamChooseSchema = z
  .object({
    teamId: z.string().min(1).optional(),
    newTeamName: z.string().trim().min(2).max(14).optional(),
  })
  .refine((value) => (value.teamId !== undefined) !== (value.newTeamName !== undefined), {
    message: 'Se requiere teamId o newTeamName, pero no ambos',
  });

export const categoriesPickSchema = z.object({
  categoryIds: z.array(z.string().min(1)).length(3),
});

export const answerSubmitSchema = z.object({
  questionId: z.string().min(1),
  optionIndex: correctIndexSchema,
});

export const buzzSchema = z.object({
  questionId: z.string().min(1),
});

export const tapSchema = z.object({
  gameId: z.string().min(1),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  clientTs: z.number().int().nonnegative().optional(),
});

export const voteSchema = z.object({
  promptId: z.string().min(1),
  optionIndex: z.number().int().nonnegative(),
});

export const simonPressSchema = z.object({
  gameId: z.string().min(1),
  buttonIndex: z.number().int().min(0).max(3),
});

export const timePongSchema = z.object({
  clientSentAtMs: z.number().positive(),
});
