import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/layout/MainLayout';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const PageEditor = lazy(() => import('./pages/PageEditor').then(m => ({ default: m.PageEditor })));
const WhiteboardPage = lazy(() => import('./pages/WhiteboardPage').then(m => ({ default: m.WhiteboardPage })));
const CalendarPage = lazy(() => import('./pages/CalendarPage').then(m => ({ default: m.CalendarPage })));
const GraphPage = lazy(() => import('./pages/GraphPage').then(m => ({ default: m.GraphPage })));
const TrashPage = lazy(() => import('./pages/TrashPage').then(m => ({ default: m.TrashPage })));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage').then(m => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('./pages/TermsOfServicePage').then(m => ({ default: m.TermsOfServicePage })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));

const PageLoader = () => (
  <div className="w-full h-full flex items-center justify-center bg-background text-text-muted text-sm animate-pulse">
    Loading...
  </div>
);

function App() {
  const isPublicWebsite = import.meta.env.VITE_IS_PUBLIC_WEBSITE === 'true';

  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route 
            path="/" 
            element={isPublicWebsite ? <LandingPage /> : <Navigate to="/app" replace />} 
          />
          
          <Route path="/app" element={<MainLayout />}>
            <Route index element={<HomePage />} />
            <Route path="page/:id" element={<PageEditor />} />
            <Route path="whiteboard/:id" element={<WhiteboardPage />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="graph" element={<GraphPage />} />
            <Route path="trash" element={<TrashPage />} />
          </Route>
          
          {/* Public Legal Pages */}
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
