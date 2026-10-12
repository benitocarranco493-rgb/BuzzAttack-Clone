import { APP_NAME } from '@buzz/shared';

export function App() {
  return (
    <main className="app-shell">
      <h1 className="app-title">{APP_NAME}</h1>
      <p className="tagline">Un juego de salón multijugador para casa.</p>
      <p className="status">
        Fase 0: andamiaje completado. Próximamente: salas, podios y preguntas.
      </p>
    </main>
  );
}
