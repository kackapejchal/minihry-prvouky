import React, { useState, Suspense } from 'react';
import { GAME_REGISTRY, GameType, GameConfig } from '../constants/gameRegistry';
import { Button } from './ui/button';
import { Settings, Play, Leaf, Clock, ShieldCheck, Orbit, Flag, LayoutGrid, type LucideIcon } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import Container5 from '../imports/Container-9188-1388';
import { PRVOUKA_GAME_GROUPS, prvoukaLandingGame } from '../prvouka/registry';
import PRVOUKA_PHOTO_CREDITS from '../prvouka/photo-credits.json';

/** Dlaždice kategorií na telefonu: krátký název a ikona. „3. ročník: …“ se rozdělí na štítek a název. */
const CATEGORY_TILES: Record<string, { short: string; icon: LucideIcon }> = {
  'Poznávám přírodu': { short: 'Příroda', icon: Leaf },
  'Orientace v čase': { short: 'Čas', icon: Clock },
  'Bezpečí a zdraví': { short: 'Bezpečí', icon: ShieldCheck },
  '3. ročník: Vesmír a Země': { short: 'Vesmír', icon: Orbit },
  '3. ročník: Naše republika': { short: 'Republika', icon: Flag },
};

function categoryTile(title: string) {
  const grade = title.match(/^(\d+\. ročník):\s*(.*)$/);
  const rest = grade ? grade[2] : title;
  const meta = CATEGORY_TILES[title];
  return { label: meta?.short ?? rest, icon: meta?.icon ?? LayoutGrid, grade: grade ? grade[1] : null };
}

interface AdminPanelProps {
  onConfigureGame: (gameId: GameType) => void;
  /** Předmět rozcestníku: matematika (výchozí) nebo prvouka (cesta /prvouka). */
  subject?: 'math' | 'prvouka';
}

/** Obálky pracovních učebnic prvouky z knihovny Vividbooks (vějíř v hlavičce). */
const PRVOUKA_COVERS = [
  'https://qypiuvqglsmxdsnyazih.supabase.co/storage/v1/object/public/platform-admin/files/assets/768a488e-465d-4735-8640-0a5a8158ea5d-workbook-1-2a82d142-ea68-4724-b00b-87dd9da2f144/image/83fe0e48a283584bcf9aee5e2f0982248f9745d6.png',
  'https://qypiuvqglsmxdsnyazih.supabase.co/storage/v1/object/public/platform-admin/files/assets/768a488e-465d-4735-8640-0a5a8158ea5d-workbook-21-bd054f3f-04c5-43bd-8ab2-85f19d8c2a1a/image/96dab1b936f3a050e5119c467cb72e88eb8787ae.png',
  'https://qypiuvqglsmxdsnyazih.supabase.co/storage/v1/object/public/platform-admin/files/assets/768a488e-465d-4735-8640-0a5a8158ea5d-workbook-35-59e12b18-d549-45b8-bb9a-3d979e22ade4/image/d86d66b170e9652b51e2b1c5753a60a23d242268.jpg',
  // Prvouka 3. ročník / 1. díl (obálka z e-shopu)
  'https://iekkundgizzdbmkzatdl.supabase.co/storage/v1/object/public/make-93a20b6f-images/1791798619084-jq7iegvwhtm.jpg',
];

// Lazy loaded image component to prevent blocking - optimized
const LazyGameImage = React.memo(({ src, alt, className, objectPosition }: { src: string | null, alt: string, className: string, objectPosition?: string }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  if (!src) return null;

  return (
    <div className={`${className} relative`}>
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-100 animate-pulse rounded-t-3xl flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        style={objectPosition ? { objectPosition } : undefined}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading="lazy"
        decoding="async"
      />
      {hasError && (
        <div className="absolute inset-0 bg-gray-100 rounded-t-3xl flex items-center justify-center">
          <span className="text-gray-400 text-sm">Obrázek se nepodařilo načíst</span>
        </div>
      )}
    </div>
  );
});

LazyGameImage.displayName = 'LazyGameImage';

export const AdminPanel = React.memo(({ onConfigureGame, subject = 'math' }: AdminPanelProps) => {
  const isPrvouka = subject === 'prvouka';
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const handlePlayGame = (gameId: GameType) => {
    setSelectedGame(gameId);
    onConfigureGame(gameId);
  };

  // Všechny hry v jednom seznamu bez kategorií s PNG náhledy
  const mathGameGroups = [
    {
      title: "Poznávám čísla",
      games: [
        { 
          id: 'numberRecognition', 
          name: 'Poznej čísla', 
          description: 'děti poznávají první čísla pomocí čárek, teček a rytmu.', 
          bg: '#ceeffd', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/poznej_cisla.png'
        },
        { 
          id: 'numberComparison', 
          name: 'Rozřaď čísla', 
          description: 'porovnáváme, co je větší a co menší.', 
          bg: '#fcfbdc', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/rozrad_cisla%20(1).png'
        },
        { 
          id: 'quantityComparison', 
          name: 'Čeho je víc?', 
          description: 'určujeme, čeho je více nebo méně.', 
          bg: '#fff999', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/ceho_je_vice.png'
        },
        { 
          id: 'boardGame', 
          name: 'Člověče nezlob se', 
          description: 'trénujeme číselnou řadu házením kostkou a pohybem figurky.', 
          bg: '#B6FFE7', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/clovece.png',
          emoji: '🎲'
        },
        { 
          id: 'mrBall', 
          name: 'Pan Kulička', 
          description: 'Počítání políček. Žáci počítají kroky, mohou chodit v jednom kole tam i zpátky.', 
          bg: '#FFE5B4', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/pan_kulicka.png',
          emoji: '⚽'
        }
      ]
    },
    {
      title: "Řady a vzory",
      games: [
        { 
          id: 'patternSequence', 
          name: 'Doplň vzor', 
          description: 'doplňujeme chybějící prvek podle pravidla.', 
          bg: '#f9edc9', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/dopln_vzor.png'
        },
        { 
          id: 'numberSequence', 
          name: 'Číselné řady', 
          description: 'doplňujeme chybějící čísla do posloupnosti.', 
          bg: '#fcfbdc', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/ciselne_rady.png'
        }
      ]
    },
    {
      title: "Prostorová orientace",
      games: [
        { 
          id: 'tilingGame', 
          name: 'Pokládání dlaždic', 
          description: 'skládáme dlaždice a počítáme, kolik jsme jich použili.', 
          bg: '#f9edc4', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/Pokladani_dlazdic.png'
        },
        { 
          id: 'mirrorDrawing', 
          name: 'Kreslení do mřížky', 
          description: 'tvoříme zrcadlový vzor podle zadání.', 
          bg: '#fcdca0', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/kresleni_do_mrizky.png'
        },
        { 
          id: 'robotNavigation', 
          name: 'Naveď robota', 
          description: 'programujeme robota, aby našel cestu k cíli.', 
          bg: '#d1cfff', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/naved_robota.png'
        }
      ]
    },
    {
      title: "Počítám a procvičuji",
      games: [
        { 
          id: 'dominoGame', 
          name: 'Domino', 
          description: 'sčítáme tečky na stranách domina.', 
          bg: '#e6e6e6', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/domino.png'
        },
        { 
          id: 'mathPractice', 
          name: 'Kartičky', 
          description: 'rozhodujeme, zda je příklad správný, nebo ne.', 
          bg: '#D0DBFF', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/karticky.png'
        },
        { 
          id: 'mathSnake', 
          name: 'Matematický had', 
          description: 'skládáme příklady, které vedou k cílovému číslu.', 
          bg: '#e0f2e6', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/had.png'
        },
        { 
          id: 'mathCrossword', 
          name: 'Matematická křížovka', 
          description: 'hledáme dvojice čísel se správným součtem.', 
          bg: '#e6f3ff', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/matematicka_krizovka.png',
          emoji: '🧩'
        },
        { 
          id: 'moneyExchange', 
          name: 'Zaplať a Rozměň', 
          description: 'platíme nebo rozměňujeme správné mince a bankovky.', 
          bg: '#FFD3C5', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/zaplat.png',
          emoji: '💰'
        },
        { 
          id: 'countingGame', 
          name: 'Zjisti', 
          description: 'řešíme první slovní úlohy s kuličkami a pytlíčkem.', 
          bg: '#FFF8CD', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/zjisti%20(1).png',
          emoji: '🔢'
        },
        { 
          id: 'imageReveal', 
          name: 'Odkryj obrázek', 
          description: 'Třída společně odhaluje skrytý obrázek. Děti se mohou u tabule střídat.', 
          bg: '#FFB9A2', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/obrazek.png',
          emoji: '🖼️'
        },
        { 
          id: 'buildNumber', 
          name: 'Slož číslo', 
          description: 'Skládáme čísla z kostiček', 
          bg: '#F5E6D0', 
          image: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/Group%2021337.png',
          emoji: '🧱'
        }
      ]
    }
  ];

  // Prvouka: stejné karty, ilustrace z knihovny Laioutu.
  const prvoukaGameGroups = PRVOUKA_GAME_GROUPS.map((group) => ({
    title: group.title,
    games: group.games
      .map((id) => prvoukaLandingGame(id))
      .filter((game): game is NonNullable<typeof game> => Boolean(game))
      .map((game) => ({ id: game.id, name: game.name, description: game.description, bg: game.bg, image: game.image, emoji: game.icon, imagePosition: game.imagePosition, isModel: Boolean(game.model) && game.model !== 'hvezdy' })),
  }));

  const gameGroups: Array<{ title: string; games: Array<{ id: string; name: string; description: string; bg: string; image?: string; emoji?: string; imagePosition?: string; isModel?: boolean }> }> =
    isPrvouka ? prvoukaGameGroups : mathGameGroups;

  // Filtrování kategorií podle vybrané kategorie
  const filteredGroups = selectedCategory 
    ? gameGroups.filter(group => group.title === selectedCategory)
    : gameGroups;

  // Seznam všech kategorií pro navigaci
  const categories = gameGroups.map(group => group.title);

  return (
    <div className="min-h-screen bg-white font-visby">
      {/* Header Section with Blue Background - zmenšeno o 30% */}
      <div className="relative bg-[#dee4f1] rounded-[32px] mx-4 sm:mx-[30px] max-w-[1320px] xl:mx-auto mt-4 sm:mt-[28px] mb-8 overflow-hidden lg:h-[395px]">
        
        <div className="relative z-10 px-6 md:px-12 pt-4 pb-2 lg:py-4">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-6 lg:gap-8">
            <div className="flex-1">
              {/* VIVID BOOKS Logo s SVG */}
              <div className="mb-2">
                <img 
                  src="https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/logo.svg"
                  alt="Vividbooks Logo"
                  className="h-18 w-18"
                />
              </div>
              
              {/* Main Title */}
              <h2 className="text-3xl md:text-5xl font-bold text-[#09056f] mb-4 md:mb-6 leading-tight">
                {isPrvouka ? <>Minihry<br />prvouky</> : <>Matematické<br />Minihry</>}
              </h2>
              
              {/* Description */}
              <div className="text-[#09056f] text-base md:text-lg leading-relaxed max-w-md">
                <p className="mb-4">
                  Minihry jsou součástí našich pracovních učebnic Vividbooks, ale pro veřejnost je nabízíme zcela zdarma.
                </p>
                <p>
                  👉 Pokud chcete pracovat s <a href={isPrvouka ? 'https://www.vividbooks.com/cs/prvouka' : 'https://www.vividbooks.com/cs/matematika-1-stupen'} target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-600 transition-colors">ucelenou metodikou</a> pro výuku {isPrvouka ? 'prvouky' : 'matematiky'}, 
                  <a href="https://www.vividbooks.com/cs/free-trial-cz" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-600 transition-colors"> vyzkoušejte Vividbooks</a> nebo 
                  <a href="https://eshop.vividbooks.com/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-600 transition-colors"> si objednejte pracovní učebnice</a>.
                </p>
              </div>
            </div>
            
            {/* Right side - Notebooks image and buttons */}
            <div className="flex flex-col items-center gap-4 w-full lg:w-auto">
              {/* Header Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full lg:w-auto lg:mb-4">
                <button className="px-4 md:px-6 py-3 border-2 border-[#4e5871] text-[#4e5871] rounded-lg hover:bg-[#4e5871] hover:text-white transition-colors text-sm whitespace-nowrap">
                  {isPrvouka ? 'Prvouka: 1.–3. ročník' : 'Matematika: 1. ročník'}
                </button>
                <a 
                  href="https://app.vividbooks.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 md:px-6 py-3 bg-[#4e5871] text-white rounded-lg hover:bg-[#3d4660] transition-colors flex items-center justify-center gap-2 text-sm whitespace-nowrap no-underline"
                >
                  Otevřít vividbooks učebnice
                  <span className="rotate-180">↑</span>
                </a>
              </div>
              
              {/* Notebooks Image */}
              {isPrvouka ? (
                <div className="mb-2 lg:mb-4 relative h-60 sm:h-72 md:h-80 w-[300px] sm:w-[420px] max-w-full" aria-label="Pracovní učebnice prvouky">
                  {PRVOUKA_COVERS.map((src, index) => (
                    <img
                      key={src}
                      src={src}
                      alt=""
                      className="absolute top-6 h-44 sm:h-56 md:h-64 w-auto rounded-md object-contain"
                      style={{
                        left: `${index * 22}%`,
                        transform: `rotate(${[-6, 2, 8, 14][index]}deg) translateY(${[0, 10, 22, 36][index]}px)`,
                        boxShadow: '0 12px 28px rgba(9,5,111,0.18)',
                        zIndex: index,
                      }}
                    />
                  ))}
                </div>
              ) : (
              <div className="mb-4">
                <img 
                  src="https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/Container.png"
                  alt="Vividbooks sešity"
                  className="h-80 md:h-96 w-auto object-contain"
                />
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      {/* Na telefonu dlaždice s ikonou (jako v Početníčku), na počítači pilulky v jedné řadě. */}
      <div className="md:hidden px-4 mb-8">
        <div className="grid grid-cols-3 gap-2">
          {[null, ...categories].map((category) => {
            const active = selectedCategory === category;
            const tile = category ? categoryTile(category) : { label: 'Všechny', icon: LayoutGrid, grade: null };
            const Icon = tile.icon;
            const bg = category ? gameGroups.find((group) => group.title === category)?.games[0]?.bg ?? '#eef1f8' : '#eef1f8';
            return (
              <button
                key={category ?? 'vse'}
                type="button"
                onClick={() => setSelectedCategory(category)}
                aria-label={category ?? 'Všechny hry'}
                className="relative flex flex-col items-center justify-center gap-1 rounded-2xl px-1 pt-3 pb-2.5 text-[13px] font-semibold leading-tight transition-all"
                style={active ? { background: '#4a43e8', color: '#fff', boxShadow: '0 4px 12px rgba(74,67,232,0.3)' } : { background: bg, color: '#4e5871' }}
              >
                <Icon className="w-5 h-5" strokeWidth={2.2} aria-hidden="true" />
                {tile.label}
                {tile.grade ? (
                  <span
                    className="absolute -top-2 right-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
                    style={{ background: '#fff', color: '#4a43e8', boxShadow: '0 1px 3px rgba(78,88,113,0.25)' }}
                  >
                    {tile.grade}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden md:block max-w-full px-8 mb-8">
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 ${
              selectedCategory === null
                ? 'bg-[#4a43e8] text-white shadow-[0_4px_12px_rgba(74,67,232,0.3)]'
                : 'bg-[#eef1f8] text-[#4e5871] hover:bg-[#e2e7f3]'
            }`}
          >
            Všechny hry
          </button>
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-3 rounded-full text-sm font-semibold whitespace-nowrap transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-[#4a43e8] text-white shadow-[0_4px_12px_rgba(74,67,232,0.3)]'
                  : 'bg-[#eef1f8] text-[#4e5871] hover:bg-[#e2e7f3]'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Games Section - All games organized by categories */}
      <div className="max-w-full px-4 md:px-8">
        {filteredGroups.map((group, groupIndex) => (
          <div key={group.title} className="mb-16 md:mb-20">
            <h3 className="text-2xl md:text-4xl font-bold text-[#4e5871] mb-8 md:mb-12 text-center px-2">
              {group.title}
            </h3>
            
            {/* Fixed width cards with auto-fit grid */}
            <div className="grid justify-center" style={{
              gridTemplateColumns: 'repeat(auto-fit, 350px)',
              gap: '2rem',
              justifyContent: 'center'
            }}>
              {group.games.map((game) => {
                const gameConfig = GAME_REGISTRY[game.id as GameType];
                if (!gameConfig) return null;

                return (
                  <div 
                    key={game.id} 
                    className={`relative rounded-3xl overflow-hidden transition-all duration-300 hover:shadow-xl transform hover:-translate-y-2 ${
                      selectedGame === game.id ? 'ring-4 ring-blue-400 shadow-2xl' : ''
                    }`}
                    style={{ 
                      backgroundColor: game.bg, 
                      width: '350px',
                      height: '410px'
                    }}
                  >
                    {/* Game Image Area - podle Figma designu */}
                    <div className="h-[215px] rounded-t-3xl overflow-hidden bg-white">
                      {game.image ? (
                        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-6xl rounded-t-3xl">Loading...</div>}>
                          <LazyGameImage
                            src={game.image}
                            alt={game.name}
                            className="w-full h-full object-cover rounded-t-3xl"
                            objectPosition={game.imagePosition}
                          />
                        </Suspense>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-6xl rounded-t-3xl">
                          {game.emoji}
                        </div>
                      )}
                    </div>

                    {/* Content area s absolutním pozicováním pro tlačítka */}
                    <div className="relative h-[155px] p-4 md:p-6">
                      {/* Game Title */}
                      <h4 className="text-xl md:text-2xl font-bold text-[#4e5871] mb-2 md:mb-3 leading-tight">
                        {game.id === 'moneyExchange' ? 'Zaplať a rozměň' : game.name}
                      </h4>

                      {/* Game Description */}
                      <p className="text-[#4e5871] text-base leading-relaxed mb-4 opacity-80">
                        {game.description}
                      </p>

                      {/* Buttons - posunuty o 20px dolů */}
                      <div className="absolute -bottom-4 left-4 right-4">
                        <button
                          onClick={() => handlePlayGame(game.id as GameType)}
                          className="w-1/2 bg-[#4a43e8] hover:bg-[#3d36d6] text-white px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          {game.isModel ? 'Otevřít model' : 'Hraj'}
                        </button>
                      </div>
                    </div>
                    
                    {/* Selection Effect */}
                    {selectedGame === game.id && (
                      <div className="absolute inset-0 bg-blue-500 bg-opacity-10 pointer-events-none rounded-3xl" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {isPrvouka ? (
        <details className="max-w-3xl mx-auto px-6 text-[#4e5871] text-sm">
          <summary className="cursor-pointer font-semibold text-center">Zdroje fotografií</summary>
          <p className="mt-3 mb-2 opacity-80">
            Ilustrace jsou z pracovních učebnic prvouky Vividbooks. Fotografie jsou z Wikimedia Commons:
          </p>
          <ul className="space-y-1 opacity-80">
            {(PRVOUKA_PHOTO_CREDITS as Array<{ key: string; file: string; license: string; author: string; source: string }>).map((credit) => (
              <li key={credit.key}>
                <a href={credit.source} target="_blank" rel="noopener noreferrer" className="underline">{credit.file.replace(/^File:/, '')}</a>
                {' – '}{credit.author || 'neznámý autor'}, {credit.license}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      {/* Footer s logem - 200px bílý prostor */}
      <div className="bg-white py-[100px] flex justify-center items-center">
        <img 
          src="https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/logo.svg"
          alt="Vividbooks Logo"
          className="h-16 w-16 opacity-60"
        />
      </div>
    </div>
  );
});

AdminPanel.displayName = 'AdminPanel';