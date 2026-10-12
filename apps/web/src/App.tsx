import { APP_NAME } from '@buzz/shared';
import { Link, Route, Routes } from 'react-router-dom';

import { t } from './i18n';
import { HostPage } from './host/HostPage';
import { PlayPage } from './play/PlayPage';

function Home() {
  return (
    <main className="app-shell">
      <h1 className="app-title">{APP_NAME}</h1>
      <p className="tagline">{t('app.tagline')}</p>
      <p className="status">{t('home.phaseNotice')}</p>
      <nav className="home-nav">
        <Link className="btn btn--primary" to="/host">
          {t('home.hostLink')}
        </Link>
        <Link className="btn btn--ghost" to="/play">
          {t('home.playLink')}
        </Link>
      </nav>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/host" element={<HostPage />} />
      <Route path="/play" element={<PlayPage />} />
    </Routes>
  );
}
