import { Suspense, lazy } from 'react';
import GlitchLoader from './components/GlitchLoader.jsx';

// Split the two audiences into separate bundles: review customers on /r/:id get
// the lightweight funnel, agency users get the dashboard — neither ships the other.
const App = lazy(() => import('./App.jsx'));
const PublicFunnel = lazy(() => import('./components/PublicFunnel.jsx'));

// Lightweight, dependency-free routing: /r/:id and /rate/:id render the public
// review funnel (the link sent in review requests); everything else is the app.
const funnelMatch = window.location.pathname.match(/^\/(?:r|rate)\/(.+?)\/?$/);

export default function Root() {
  return (
    <Suspense fallback={<GlitchLoader label="Loading VouchRank" />}>
      {funnelMatch ? <PublicFunnel locationId={decodeURIComponent(funnelMatch[1])} /> : <App />}
    </Suspense>
  );
}
