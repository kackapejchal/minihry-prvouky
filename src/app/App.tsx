import React, { useState, useEffect, Suspense } from 'react';
import { GameType, generateGameURL, resolveSharedGameSettings } from './constants/gameRegistry';
import { PRVOUKA_LANDING_GAMES } from './prvouka/registry';
import { parseGameConfigParam } from './utils/gameShareUrl';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AudioManager } from './components/AudioManager';
import { Toaster } from './components/ui/sonner';
import { SimpleLoader, ErrorFallback } from './components/SimpleLoader';
import { LegacyBrowserWarning } from './components/LegacyBrowserWarning';
import './utils/legacySupport'; // Importujeme polyfilly pro starší zařízení

// Lazy load heavy components
const AdminPanel = React.lazy(() => import('./components/AdminPanel').then(module => ({ default: module.AdminPanel })));
const GameConfigurator = React.lazy(() => import('./components/GameConfigurator').then(module => ({ default: module.GameConfigurator })));
const GameResultScreenDemo = React.lazy(() => import('./components/GameResultScreenDemo').then(module => ({ default: module.GameResultScreenDemo })));

// Simple registry check without importing the whole registry
// Samostatná aplikace Minihry prvouky – jen prvoukové hry (matematika je v projektu Vividbooks minihry).
const VALID_GAMES = PRVOUKA_LANDING_GAMES.map((game) => game.id);

const LANDING_SUBJECT: 'math' | 'prvouka' = 'prvouka';

// Enhanced loading component with better timeout handling
const GameLoader = () => {
  const [showTimeout, setShowTimeout] = useState(false);
  const [showReload, setShowReload] = useState(false);
  
  useEffect(() => {
    const timeoutTimer = setTimeout(() => {
      setShowTimeout(true);
    }, 5000); // Reduce to 5 seconds
    
    const reloadTimer = setTimeout(() => {
      setShowReload(true);
    }, 10000); // Reduce to 10 seconds
    
    return () => {
      clearTimeout(timeoutTimer);
      clearTimeout(reloadTimer);
    };
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-lg text-gray-600 font-medium">Načítám hru...</p>
        {showTimeout && (
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700 mb-2">
              Načítání trvá déle než obvykle...
            </p>
            {showReload && (
              <button 
                onClick={() => window.location.reload()}
                className="text-sm bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-3 py-1 rounded transition-colors"
              >
                Obnovit stránku
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Simple component loader
const ComponentLoader = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center min-h-screen bg-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="text-gray-600">Načítám...</p>
    </div>
  </div>
);

type AppMode = 'admin' | 'configurator' | 'game';

// Simplified game wrapper with responsive button positioning
const GameWrapper = ({ children, showBackButton, onBackToAdmin, onOpenSettings }: {
  children: React.ReactNode;
  showBackButton: boolean;
  onBackToAdmin: () => void;
  onOpenSettings: () => void;
}) => {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Game content */}
      <div className="flex-1">
        {children}
      </div>
      
      {/* Navigation buttons - responsive positioning */}
      {showBackButton && (
        <>
          {/* Desktop - fixed position as before */}
          <div className="hidden md:block fixed bottom-4 left-4 z-50">
            <div className="flex items-center gap-3">
              <button
                onClick={onBackToAdmin}
                className="bg-white hover:bg-[#f4f5fa] text-[#4e5871] font-bold px-5 py-2.5 rounded-full border-2 border-[#4e5871] shadow-[0_3px_0_#4e5871] hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none flex items-center gap-2 transition-all text-base"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
                Všechny hry
              </button>
              <button
                onClick={onOpenSettings}
                className="bg-white hover:bg-[#f4f5fa] text-[#4e5871] font-bold px-5 py-2.5 rounded-full border-2 border-[#4e5871] shadow-[0_3px_0_#4e5871] hover:-translate-y-0.5 active:translate-y-[3px] active:shadow-none flex items-center gap-2 transition-all text-base"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Nastavení
              </button>
            </div>
          </div>
          
          {/* Mobile - static position at bottom */}
          <div className="md:hidden bg-white border-t border-gray-200 p-4">
            <div className="flex items-center justify-center gap-4 max-w-md mx-auto">
              <button
                onClick={onBackToAdmin}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-4 py-3 rounded-lg border border-gray-300 flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Všechny hry
              </button>
              <button
                onClick={onOpenSettings}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 px-4 py-3 rounded-lg border border-gray-300 flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Nastavení
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default function App() {
  const [mode, setMode] = useState<AppMode>('admin');
  const [selectedGameId, setSelectedGameId] = useState<GameType | null>(null);
  const [gameSettings, setGameSettings] = useState<Record<string, any> | null>(null);
  const [showDemo, setShowDemo] = useState(false);

  // URL parameter processing on page load
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const gameParam = url.searchParams.get('game');
      const configParam = url.searchParams.get('config');

      if (gameParam && VALID_GAMES.includes(gameParam)) {
        setSelectedGameId(gameParam as GameType);
        
        if (configParam) {
          const parsedConfig = parseGameConfigParam(configParam);
          if (parsedConfig) {
            setGameSettings(resolveSharedGameSettings(gameParam as GameType, parsedConfig));
          } else {
            console.warn('Failed to load config from URL');
            setGameSettings(null);
          }
        } else {
          setGameSettings(null);
        }
        
        setMode('game');
      } else {
        setMode('admin');
      }
    } catch (error) {
      console.error('Error processing URL parameters:', error);
      setMode('admin');
    }
  }, []);

  const handleSelectGame = (gameId: GameType) => {
    setSelectedGameId(gameId);
    setGameSettings(null);
    setMode('game');
    
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('game', gameId);
      url.searchParams.delete('config');
      window.history.pushState({}, '', url.toString());
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  const handleConfigureGame = (gameId: GameType) => {
    setSelectedGameId(gameId);
    setMode('configurator');
    // Bezpečný scroll pro starší prohlížeče
    try {
      window.scrollTo(0, 0);
    } catch (e) {
      console.warn('Scroll failed:', e);
    }
  };

  const handlePlayConfiguredGame = (gameId: GameType, settings: Record<string, any>) => {
    setSelectedGameId(gameId);
    setGameSettings(settings);
    setMode('game');
    
    try {
      window.history.pushState({}, '', generateGameURL(gameId, settings));
    } catch (error) {
      console.error('Error updating URL:', error);
    }
  };

  const handleBackToAdmin = () => {
    setMode('admin');
    setSelectedGameId(null);
    setGameSettings(null);
    
    try {
      const url = new URL(window.location.href);
      url.search = '';
      window.history.pushState({}, '', url.toString());
    } catch (error) {
      console.error('Error clearing URL:', error);
    }
  };

  // Dynamic game component loading - only load when needed
  const getGameComponent = (gameId: GameType) => {
    const gameComponents = {
      ...Object.fromEntries(
        PRVOUKA_LANDING_GAMES.map((game) => [
          game.id,
          game.model === 'hvezdy'
            ? () => import('./prvouka/PrvoukaStars').then((module) => ({ default: module.PrvoukaStars }))
            : game.model
            ? () => import('./prvouka/PrvoukaSpaceModel').then((module) => ({
              default: (props: { settings?: Record<string, any> }) => <module.PrvoukaSpaceModel model={game.model as 'soustava' | 'mesic'} {...props} />,
            }))
            : () => import('./prvouka/PrvoukaGame').then((module) => ({
              default: (props: { settings?: Record<string, any> }) => (
                <module.PrvoukaGame prvoukaGameId={game.dataId} defaultBackground={game.playBg} defaultGrade={game.grades?.[0]} {...props} />
              ),
            })),
        ]),
      ),
    } as Record<string, () => Promise<{ default: React.ComponentType<any> }>>;
    
    const importFunction = gameComponents[gameId];
    return importFunction ? React.lazy(importFunction) : null;
  };

  const renderGame = () => {
    if (!selectedGameId) return null;
    
    try {
      const GameComponent = getGameComponent(selectedGameId);
      if (!GameComponent) {
        console.warn(`Game component not found for gameId: ${selectedGameId}`);
        return (
          <div className="flex items-center justify-center min-h-screen bg-white">
            <div className="text-center">
              <p className="text-lg text-gray-600 mb-4">Hra "{selectedGameId}" nebyla nalezena</p>
              <button 
                onClick={handleBackToAdmin}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
              >
                Zpět na výběr her
              </button>
            </div>
          </div>
        );
      }

      // Tlačítka zpět se zobrazují pouze při hře spuštěné z konfiguratoru (vždy se zobrazí nastavení)
      const showBackButton = gameSettings !== null;
      
      // Special handling for specific games that need additional settings
      let gameProps = { settings: gameSettings || undefined };
      
      if (selectedGameId === 'countingGame') {
        gameProps = {
          settings: {
            ...(gameSettings || {}),
            isDirectPlay: gameSettings === null
          }
        };
      }
      
      if (selectedGameId === 'imageReveal') {
        gameProps = {
          settings: gameSettings || undefined,
          onBackToAdmin: handleBackToAdmin
        };
      }

      console.log(`Loading game: ${selectedGameId}`, { gameProps, showBackButton });

      return (
        <ErrorBoundary 
          fallback={
            <div className="flex items-center justify-center min-h-screen bg-white">
              <div className="text-center">
                <p className="text-lg text-red-600 mb-4">Chyba při načítání hry "{selectedGameId}"</p>
                <button 
                  onClick={handleBackToAdmin}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                >
                  Zpět na výběr her
                </button>
              </div>
            </div>
          }
        >
          <Suspense fallback={<GameLoader />}>
            <GameWrapper 
              showBackButton={showBackButton}
              onBackToAdmin={handleBackToAdmin}
              onOpenSettings={() => handleConfigureGame(selectedGameId)}
            >
              <GameComponent {...gameProps} />
            </GameWrapper>
          </Suspense>
        </ErrorBoundary>
      );
    } catch (error) {
      console.error('Error rendering game:', selectedGameId, error);
      return (
        <div className="flex items-center justify-center min-h-screen bg-white">
          <div className="text-center">
            <p className="text-lg text-red-600 mb-4">Chyba při načítání hry "{selectedGameId}"</p>
            <p className="text-sm text-gray-500 mb-4">{error instanceof Error ? error.message : 'Neznámá chyba'}</p>
            <button 
              onClick={handleBackToAdmin}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              Zpět na výběr her
            </button>
          </div>
        </div>
      );
    }
  };

  // Demo mode
  if (showDemo) {
    return (
      <ErrorBoundary>
        <AudioManager>
          <div className="bg-white min-h-screen">
            <div className="fixed top-4 left-4 z-50">
              <button
                onClick={() => setShowDemo(false)}
                className="bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg shadow-lg border flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Zpět na admin
              </button>
            </div>
            <Suspense fallback={<SimpleLoader message="Načítám demo..." />}>
              <GameResultScreenDemo />
            </Suspense>
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#ffffff',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                },
              }}
            />
          </div>
        </AudioManager>
      </ErrorBoundary>
    );
  }

  // Main app with fallback protection
  try {
    return (
      <ErrorBoundary>
        <AudioManager>
          <LegacyBrowserWarning />
          <div className="bg-white min-h-screen">
            {mode === 'admin' && (
              <Suspense fallback={<SimpleLoader message="Načítám administraci..." />}>
                <AdminPanel 
                  onConfigureGame={handleConfigureGame}
                  subject={LANDING_SUBJECT}
                />
              </Suspense>
            )}
            
            {mode === 'configurator' && selectedGameId && (
              <>
                {/* Renderuj AdminPanel na pozadí */}
                <Suspense fallback={<SimpleLoader message="Načítám administraci..." />}>
                  <AdminPanel 
                    onConfigureGame={handleConfigureGame}
                    subject={LANDING_SUBJECT}
                  />
                </Suspense>
                
                {/* Modal overlay pro konfigurátor */}
                <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center">
                  <div className="bg-white rounded-t-3xl shadow-2xl w-full max-w-4xl h-[95vh] overflow-hidden">
                    <Suspense fallback={<SimpleLoader message="Načítám konfigurátor..." />}>
                      <GameConfigurator
                        gameId={selectedGameId}
                        onBack={handleBackToAdmin}
                        onPlayGame={handlePlayConfiguredGame}
                      />
                    </Suspense>
                  </div>
                </div>
              </>
            )}
            
            {mode === 'game' && renderGame()}
            
            <Toaster 
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  background: '#ffffff',
                  color: '#374151',
                  border: '1px solid #E5E7EB',
                  fontSize: '14px',
                },
              }}
            />
          </div>
        </AudioManager>
      </ErrorBoundary>
    );
  } catch (error) {
    console.error('Critical App error:', error);
    return <ErrorFallback message="Kritická chyba aplikace" onRetry={() => window.location.reload()} />;
  }
}