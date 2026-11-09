import React, { useState, useEffect } from 'react';
import { prvoukaLandingGame } from '../prvouka/registry';
import { defaultPrvoukaTopics, findPrvoukaGame } from '../prvouka/data/catalog';
import type { PrvoukaGrade } from '../prvouka/data/types';
import { GAME_REGISTRY, GameType, GameSetting, generateGameURL } from '../constants/gameRegistry';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { X, Copy, Play, RotateCcw, ExternalLink, ChevronDown, ChevronRight, Settings2, Link2, QrCode } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ShareConfigQr, ShareQrOverlay } from './ShareConfigQr';

/** Barvy a tvary převzaté z menu Početníčku (1. stupeň). */
const ACCENT = '#5d6fc8';
/** Zapnuté volby (zaškrtávátka, vypínače) – stejná fialová jako přepínače; zelená patří jen tlačítku Hrát. */
const CHIP_ON = ACCENT;
const SEGMENT = 'h-10 px-5 rounded-full text-[15px] font-bold whitespace-nowrap transition-all';

/**
 * „1/2/18–21“ (ročník/díl/strana) → „2. díl, s. 18–21“; jiný ročník než zvolený se vypíše celý
 * („2. roč., 1. díl, s. 15“). Text, který tomu tvaru neodpovídá („celý rok“), zůstane.
 */
function formatWorkbookPages(raw: string, grade: number): string {
  return raw
    .split(/,\s*/)
    .map((part) => {
      const m = part.trim().match(/^(\d)\/(\d)\/(.+)$/);
      if (!m) return part.trim();
      const [, g, d, page] = m;
      return Number(g) === grade ? `${d}. díl, s. ${page}` : `${g}. roč., ${d}. díl, s. ${page}`;
    })
    .join(' · ');
}

/** Rozbalovací karta (Pokročilá nastavení, Sdílet): tlačítko nahoře, obsah se rozbalí uvnitř téže karty. */
const FOLD_CARD = 'rounded-3xl bg-white border border-[#e2e8f0]/70 shadow-[0_1px_3px_rgba(78,88,113,0.06)] overflow-hidden';
const FOLD_TRIGGER = 'flex items-center gap-3 w-full px-6 py-4 text-left text-lg font-bold text-[#4e5871] hover:bg-[#f7f8fc] transition-colors';

interface GameConfiguratorProps {
  gameId: GameType;
  onBack: () => void;
  onPlayGame: (gameId: GameType, settings: Record<string, any>) => void;
}

// Mapování her na barvy pozadí (podle předdefinovaných speciálních her)
const getGameBackgroundColor = (gameId: GameType, settings: Record<string, any>) => {
  // Mapování podle barev z AdminPanel dlaždic - VŽDY používáme barvu podle gameId
  const gameBackgroundColors: Partial<Record<GameType, string>> = {
    numberRecognition: '#ceeffd',
    dominoGame: '#e6e6e6', 
    numberComparison: '#fcfbdc',
    quantityComparison: '#fff999',
    boardGame: '#B6FFE7',
    mrBall: '#FFE5B4',
    patternSequence: '#f9edc9',
    numberSequence: '#fcfbdc',
    tilingGame: '#f9edc4',
    mirrorDrawing: '#fcdca0',
    robotNavigation: '#d1cfff',
    mathPractice: '#D0DBFF',
    mathSnake: '#e0f2e6',
    mathCrossword: '#e6f3ff',
    moneyExchange: '#FFD3C5',
    countingGame: '#FFF8CD',
    imageReveal: '#FFB9A2',
    buildNumber: '#F5E6D0'
  };
  
  return gameBackgroundColors[gameId] || prvoukaLandingGame(gameId)?.bg || '#F5E6D0'; // béžová jako fallback
};

// Mapování her na obrázky podle AdminPanel
const getGameImage = (gameId: GameType): string | null => {
  const gameImages: Partial<Record<GameType, string | null>> = {
    numberRecognition: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/poznej_cisla.png',
    dominoGame: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/domino.png',
    numberComparison: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/rozrad_cisla%20(1).png',
    quantityComparison: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/ceho_je_vice.png',
    boardGame: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/clovece.png',
    mrBall: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/pan_kulicka.png',
    patternSequence: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/dopln_vzor.png',
    numberSequence: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/ciselne_rady.png',
    tilingGame: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/Pokladani_dlazdic.png',
    mirrorDrawing: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/kresleni_do_mrizky.png',
    robotNavigation: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/naved_robota.png',
    mathPractice: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/karticky.png',
    mathSnake: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/had.png',
    mathCrossword: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/matematicka_krizovka.png',
    moneyExchange: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/zaplat.png',
    countingGame: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/zjisti%20(1).png',
    imageReveal: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/nahledy/obrazek.png',
    buildNumber: 'https://jjpiguuubvmiobmixwgh.supabase.co/storage/v1/object/public/Admin%20math/Group%2021337.png'
  };
  
  const prvouka = prvoukaLandingGame(gameId);
  return gameImages[gameId] || prvouka?.iconImage || prvouka?.image || null;
};

// Mapování her na popisky podle AdminPanel
const getGameDescription = (gameId: GameType): string => {
  const gameDescriptions: Partial<Record<GameType, string>> = {
    numberRecognition: 'Děti se seznamují s prvními čísly. Učí se je zapisovat čárkami a tečkami, vyťukávat rytmus nebo je rozpoznávat sluchem.',
    dominoGame: 'Na kostce domina jsou dvě strany – kolik teček chybí a kolik je jich dohromady? Hra rozvíjí první kroky ke sčítání.',
    numberComparison: 'Rychlá hra na čas: určujeme, co je větší a co menší. V pokročilejších úrovních se přidává i sčítání.',
    quantityComparison: 'Porovnáváme množství a rozhodujeme, čeho je více.',
    boardGame: 'Oblíbená hra v matematickém kabátě. Děti trénují číselnou řadu i orientaci v prostoru – hodí kostkou, spočítají kroky a jdou vyzvednout balíček.',
    mrBall: 'Počítání políček. Žáci počítají kroky, mohou chodit v jednom kole tam i zpátky. Plánuj cestu, tref se na výtah a dojdi první k srdíčku!',
    patternSequence: 'V řadě kartiček něco chybí. Úkolem je nejdřív odhalit pravidlo a pak správně doplnit chybějící prvek.',
    numberSequence: 'Číselná řada je sestavena podle určitého pravidla. Najdi toto pravidlo a řadu doplň.',
    tilingGame: 'Na dvorku skládáme dlaždice podle vlastních představ. Zaplníme celé hřiště? A kolik dlaždic jsme při tom použili?',
    mirrorDrawing: 'Kreslíme podle vzoru. Počítáme čtverečky i prázdná místa a vytváříme zrcadlový obraz. Pozor, ať neklikneš vedle!',
    robotNavigation: 'Robot stojí na mřížce a musí se dostat k cíli – někdy je cílů dokonce víc. Děti mu dopředu najdou cestu a pomocí šipek ji „naprogramují". Pak už stačí spustit a sledovat, jestli robot došel správně.',
    mathPractice: 'Počítáme rychle. Děti rozhodují, zda je výsledek správně.',
    mathSnake: 'Tvoříme rovnosti, které nás postupně dovedou k cílovému číslu. Hledáme výpočty, které dají daný součet. Každý takový výpočet prodlužuje hada',
    mathCrossword: 'V mřížce se skrývají čísla – úkolem je najít dvojice, které dávají dohromady správný součet. Kdo zvládne i odčítání, má o zábavu postaráno.',
    moneyExchange: 'V obchodě platíme nebo rozměňujeme peníze. Děti vysypou penízky z peněženky a hledají tu správnou kombinaci mincí.',
    countingGame: 'Zjišťujeme neznámé počty. Například: „Na stole mám pytlíček a vedle něj tři kuličky. Jedna kulička je mimo pytlík – kolik jich je uvnitř?" Obtížnost i prostředí si lze nastavit podle potřeby.',
    imageReveal: 'Třída společně odhaluje skrytý obrázek. Děti se mohou u tabule střídat.',
    buildNumber: 'Skládáme čísla z kostiček'
  };
  
  return gameDescriptions[gameId] || prvoukaLandingGame(gameId)?.longDescription || '';
};

export function GameConfigurator({ gameId, onBack, onPlayGame }: GameConfiguratorProps) {
  const game = GAME_REGISTRY[gameId];
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [generatedUrl, setGeneratedUrl] = useState<string>('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Inicializace defaultních hodnot
  useEffect(() => {
    const defaultSettings: Record<string, any> = {};
    Object.entries(game.settings).forEach(([key, setting]) => {
      defaultSettings[key] = setting.defaultValue;
    });
    setSettings(defaultSettings);
  }, [game.settings]);

  // Generování URL při změně nastavení
  useEffect(() => {
    if (Object.keys(settings).length > 0) {
      const url = generateGameURL(gameId, settings);
      setGeneratedUrl(url);
    }
  }, [gameId, settings]);

  // Získání barvy pozadí pro aktuální hru
  const backgroundColor = getGameBackgroundColor(gameId, settings);

  // Získání obrázku a popisku pro aktuální hru
  const gameImage = getGameImage(gameId);
  const gameDescription = getGameDescription(gameId);

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };

      // Prvouka: jiný ročník = jiná témata ze sešitu. Zaškrtnou se ta, která k ročníku patří.
      if (key === 'grade') {
        const landing = prvoukaLandingGame(gameId);
        const data = landing ? findPrvoukaGame(landing.dataId) : undefined;
        if (data && 'topics' in prev) newSettings.topics = defaultPrvoukaTopics(data, Number(value) as PrvoukaGrade);
      }
      
      // Speciální logika pro matematickou křížovku - při změně level aktualizuj související parametry
      if (gameId === 'mathCrossword' && key === 'level') {
        // DEFAULT_LEVELS podle MathCrosswordGame
        const DEFAULT_LEVELS = {
          1: { 
            grid: { rows: 3, cols: 3 },
            valueMin: 1, valueMax: 9,
            differenceMin: 1, differenceMax: 4,
            desiredPairs: 3
          },
          2: { 
            grid: { rows: 4, cols: 4 },
            valueMin: 0, valueMax: 8,
            differenceMin: 2, differenceMax: 6,
            desiredPairs: 4
          },
          3: { 
            grid: { rows: 5, cols: 5 },
            valueMin: 0, valueMax: 15,
            differenceMin: 3, differenceMax: 10,
            desiredPairs: 5
          },
        };
        
        const levelConfig = DEFAULT_LEVELS[value];
        if (levelConfig) {
          // Aktualizuj všechny související parametry podle levelu
          newSettings.gridRows = levelConfig.grid.rows;
          newSettings.gridCols = levelConfig.grid.cols;
          newSettings.valueMin = levelConfig.valueMin;
          newSettings.valueMax = levelConfig.valueMax;
          newSettings.differenceMin = levelConfig.differenceMin;
          newSettings.differenceMax = levelConfig.differenceMax;
          newSettings.desiredPairs = levelConfig.desiredPairs;
        }
      }
      
      return newSettings;
    });
  };

  const handleResetToDefaults = () => {
    const defaultSettings: Record<string, any> = {};
    Object.entries(game.settings).forEach(([key, setting]) => {
      defaultSettings[key] = setting.defaultValue;
    });
    setSettings(defaultSettings);
    toast.success('Nastavení obnoveno na výchozí hodnoty');
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      toast.success('Odkaz zkopírován do schránky!');
    } catch (error) {
      toast.error('Nepodařilo se zkopírovat odkaz');
    }
  };

  const handlePlayGame = () => {
    console.log('GameConfigurator sending settings for', gameId, ':', settings);
    onPlayGame(gameId, settings);
  };

  // Nastavení k úplnému ignorování (odstranění z UI)
  const ignoredSettings = [
    'containerWidth', 'containerHeight', 'feedbackDuration', 'spawnDelay', 
    'gridHeight', 'countdownDuration', 'progressionDelay', 'maxDifference',
    'coinGenerationMultiplier'
  ];

  // Funkce pro určení, zda je nastavení pokročilé
  const isAdvancedSetting = (key: string, setting: GameSetting) => {
    // Základní nastavení, která zůstávají vždy viditelná
    const basicKeys = [
      // Rozsahy čísel - NEJDŮLEŽITĚJŠÍ
      'minNumber', 'maxNumber', 'numberRange', 'minObjects', 'maxObjects', 'objectRange',
      
      // Obtížnost - VŽDY v základních nastaveních
      'difficulty', 'level', 'startingLevel',
      
      // Typy operací a herní módy
      'operationType', 'gameModes', 'gameMode', 'itemCategories', 'coinTypes',
      'sequenceTypes', 'patternTypes', 'environments',
      
      // Typy zadání a úkolů pro numberRecognition - PŘESUNUTÉ DO ZÁKLADNÍCH
      'challengeTypes', 'taskTypes',
      
      // Typy reprezentací pro numberComparison - v hlavním nastavení
      'representationTypes',
      
      // Typy kartiček pro numberSequence - v hlavním nastavení
      'cardTypes',
      
      // Specifické základní nastavení pro quantityComparison
      'timeBasedGame',

      // Prvouka: ročník, témata a počet úloh
      'grade', 'topics', 'rounds'
    ];

    // Pokud je to základní klíč, není pokročilé
    if (basicKeys.includes(key)) return false;

    // Všechno ostatní je pokročilé
    return true;
  };

  // Rozdělení nastavení na základní, pokročilé a ignorované
  const { basicSettings, advancedSettings } = React.useMemo(() => {
    const basic: Record<string, GameSetting> = {};
    const advanced: Record<string, GameSetting> = {};

    Object.entries(game.settings).forEach(([key, setting]) => {
      // Ignoruj některá nastavení úplně
      if (ignoredSettings.includes(key)) return;

      if (isAdvancedSetting(key, setting)) {
        advanced[key] = setting;
      } else {
        basic[key] = setting;
      }
    });

    return { basicSettings: basic, advancedSettings: advanced };
  }, [game.settings]);

  // Seřadit základní nastavení - rozsah čísel vždy první, timeBasedGame hned po něm pro quantityComparison
  const sortedBasicSettings = React.useMemo(() => {
    const entries = Object.entries(basicSettings);
    
    // Najdi nastavení rozsahu čísel a dej ho na začátek
    const rangeKeys = ['numberRange', 'objectRange', 'minNumber', 'maxNumber', 'minObjects', 'maxObjects'];
    const rangeEntry = entries.find(([key]) => rangeKeys.includes(key));
    
    // Pro quantityComparison dej timeBasedGame hned po rozsahu
    const timeBasedEntry = entries.find(([key]) => key === 'timeBasedGame');
    const otherEntries = entries.filter(([key]) => !rangeKeys.includes(key) && key !== 'timeBasedGame');
    
    if ((gameId === 'quantityComparison' || gameId === 'numberRecognition') && rangeEntry && timeBasedEntry) {
      return [rangeEntry, timeBasedEntry, ...otherEntries];
    } else if (rangeEntry) {
      return [rangeEntry, ...otherEntries];
    }
    return entries;
  }, [basicSettings, gameId]);

  /** Jedna volba bez rámečků: nadpis, šedý popisek a pod tím rovnou ovládání; oddělené tenkou čarou. */
  const renderFlatSetting = (key: string, setting: GameSetting, isBasic: boolean) => (
    <div key={key} className="space-y-3 pt-6 first:pt-0 border-t first:border-t-0 border-gray-200">
      <div>
        <Label className="block font-bold text-lg text-[#4e5871]">{setting.name}</Label>
        {setting.description ? <p className="text-sm text-gray-500 mt-1">{setting.description}</p> : null}
      </div>
      {renderSettingInput(key, setting, isBasic)}
    </div>
  );

  const renderSettingInput = (key: string, setting: GameSetting, isBasic: boolean = false) => {
    const value = settings[key];

    switch (setting.type) {
      case 'number':
        return (
          <Input
            type="number"
            value={value || ''}
            onChange={(e) => handleSettingChange(key, Number(e.target.value))}
            min={setting.min}
            max={setting.max}
            step={setting.step || 1}
            className={`w-full ${isBasic ? 'text-2xl p-8' : 'text-lg p-4'}`}
          />
        );

      case 'select':
        // Málo možností (ročník, počet úloh, vzhled…) = pilulky jako v Početníčku, víc možností = rozbalovací seznam.
        if ((setting.options?.length ?? 0) > 0 && (setting.options?.length ?? 0) <= 6) {
          return (
            // Spojený přepínač: jedna šedá kapsle, vybraná možnost je v ní plná fialová „pilulka“.
            <div className="inline-flex max-w-full rounded-full p-1.5" style={{ background: '#eef1f8' }} role="radiogroup" aria-label={setting.name}>
              {setting.options!.map((option) => {
                const active = value?.toString() === option.value.toString();
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => handleSettingChange(key, typeof setting.defaultValue === 'number' ? Number(option.value) : option.value)}
                    className={SEGMENT}
                    style={active ? { background: ACCENT, color: '#fff', boxShadow: '0 2px 6px rgba(93,111,200,.35)' } : { background: 'transparent', color: '#4e5871' }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          );
        }
        return (
          <Select 
            value={value?.toString()} 
            onValueChange={(newValue) => {
              // Převést zpět na správný typ - pokud je původní hodnota číslo, konvertovat na číslo
              const parsedValue = typeof setting.defaultValue === 'number' ? Number(newValue) : newValue;
              handleSettingChange(key, parsedValue);
            }}
          >
            <SelectTrigger className={`${isBasic ? 'text-2xl p-8' : 'text-lg p-4'}`}>
              <SelectValue placeholder="Vyberte možnost..." />
            </SelectTrigger>
            <SelectContent>
              {setting.options?.map((option) => (
                <SelectItem key={option.value} value={option.value.toString()} className="text-xl">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'boolean': {
        const on = Boolean(value);
        return (
          <button type="button" role="switch" aria-checked={on} onClick={() => handleSettingChange(key, !on)} className="flex items-center gap-3 text-base font-semibold text-[#4e5871]">
            <span className="relative inline-block w-11 h-6 rounded-full transition-colors" style={{ background: on ? CHIP_ON : '#d5dbeb' }}>
              <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
            </span>
            {on ? 'Zapnuto' : 'Vypnuto'}
          </button>
        );
      }

      case 'range':
        const [min, max] = value || [setting.min || 0, setting.max || 10];
        const isNumberRange = key === 'numberRange' || key.includes('Range') || key.includes('Number');
        
        return (
          <div className="space-y-6">
            <Slider
              value={[min, max]}
              onValueChange={([newMin, newMax]) => handleSettingChange(key, [newMin, newMax])}
              min={setting.min || 0}
              max={setting.max || 100}
              step={setting.step || 1}
              className={`w-full ${isNumberRange && isBasic ? 'h-32 slider-extra-large-handles' : 'h-8 slider-large-handles'}`}
            />
            <div className={`flex justify-between font-bold ${isNumberRange && isBasic ? 'text-3xl text-blue-700' : 'text-xl text-gray-700'}`}>
              <span>Min: {min}</span>
              <span>Max: {max}</span>
            </div>
          </div>
        );

      case 'multiselect': {
        const selectedValues: any[] = value || [];
        // Témata jako seznam se zaškrtávátky: zelené políčko s fajfkou, strany ze sešitu šedě pod názvem.
        return (
          <div className="flex flex-col gap-0.5 -mx-2">
            {setting.options?.map((option) => {
              const on = selectedValues.includes(option.value);
              const match = String(option.label).match(/^(.*?)\s*\(str\.\s*([^)]*)\)\s*$/);
              const title = match ? match[1] : option.label;
              const pages = match ? formatWorkbookPages(match[2], Number(settings.grade)) : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => handleSettingChange(key, on ? selectedValues.filter((v) => v !== option.value) : [...selectedValues, option.value])}
                  className="flex items-center gap-3.5 w-full rounded-xl px-2 py-2 text-left text-[#4e5871] hover:bg-[#f4f6fb] transition-colors"
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors"
                    style={on ? { background: CHIP_ON, border: `2px solid ${CHIP_ON}` } : { background: '#fff', border: '2px solid #c9d0e0' }}
                    aria-hidden="true"
                  >
                    {on ? (
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="#fff" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                    ) : null}
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-[17px] font-semibold">{title}</span>
                    {pages ? <span className="text-sm text-gray-500 mt-0.5">{pages}</span> : null}
                  </span>
                </button>
              );
            })}
          </div>
        );
      }

      default:
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleSettingChange(key, e.target.value)}
            className={`w-full ${isBasic ? 'text-2xl p-8' : 'text-lg p-4'}`}
          />
        );
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col" style={{ backgroundColor }}>
      <div className="p-6 h-full overflow-y-auto">
        {/* Křížek v kolečku - nahrazení tlačítka zpět */}
        <div className="absolute top-4 left-4 z-50">
          <button
            onClick={onBack}
            className="flex items-center justify-center w-12 h-12 bg-white/90 hover:bg-white text-gray-600 hover:text-gray-800 rounded-full shadow-lg border border-gray-300 transition-all duration-200 hover:scale-105"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Náhled hry s popiskem */}
        <div className="text-center mb-8 pt-8">
          <div className="w-40 h-40 mx-auto bg-white rounded-3xl flex items-center justify-center mb-4 border-4 border-white/40 shadow-xl relative overflow-hidden">
            {gameImage ? (
              <img
                src={gameImage}
                alt={game.name}
                className="w-full h-full object-cover rounded-3xl"
                onError={(e) => {
                  // Fallback na emoji ikonu při chybě načítání obrázku
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            
            {/* Fallback emoji ikona */}
            <div className={`absolute inset-0 ${gameImage ? 'hidden' : 'flex'} items-center justify-center bg-white/30 rounded-3xl`}>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-white/10"></div>
              <div className="absolute top-2 left-2 w-3 h-3 bg-white/60 rounded-full"></div>
              <div className="absolute top-2 right-2 w-3 h-3 bg-white/60 rounded-full"></div>
              <div className="absolute bottom-2 left-2 right-2 h-2 bg-white/30 rounded-full"></div>
              
              <span className="text-5xl relative z-10">{game.icon}</span>
              
              <div className="absolute inset-2 border border-white/20 rounded-2xl"></div>
            </div>
          </div>
          
          {/* Nadpis hry */}
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            {game.name}
          </h1>
          
          {/* Popisek hry */}
          <p className="text-xl text-gray-600 max-w-lg mx-auto leading-relaxed px-4 mt-6">
            {gameDescription}
          </p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <Button
            onClick={handlePlayGame}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xl py-8 rounded-3xl shadow-xl border-4 border-white/30 hover:scale-105 transition-all duration-200"
            size="lg"
          >
            <Play className="w-6 h-6 mr-3" />
            Hrát s tímto nastavením
          </Button>
          <Button
            type="button"
            onClick={() => setIsQrOpen(true)}
            disabled={!generatedUrl}
            variant="outline"
            className="sm:min-w-[13rem] bg-white text-blue-700 border-4 border-blue-200 hover:bg-blue-50 text-xl py-8 rounded-3xl shadow-xl hover:scale-105 transition-all duration-200"
            size="lg"
          >
            <QrCode className="w-6 h-6 mr-3" />
            Zobrazit QR kód
          </Button>
        </div>
        {isQrOpen && generatedUrl ? (
          <ShareQrOverlay url={generatedUrl} onClose={() => setIsQrOpen(false)} />
        ) : null}

        <div className="space-y-6 pb-8">
          {/* 1. Nastavení hry */}
          <Card className="rounded-3xl border-[#e2e8f0]/70 shadow-[0_1px_3px_rgba(78,88,113,0.06)]">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center justify-between text-[#4e5871]">
                <span>Nastavení hry</span>
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full bg-[#eef1f8] hover:bg-[#e2e7f3] text-sm font-semibold text-[#4e5871] transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Obnovit
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {sortedBasicSettings.map(([key, setting]) => {
                const isNumberRange = key === 'numberRange' || key.includes('Range') || key.includes('Number');
                const isTimeBasedSwitch = key === 'timeBasedGame';
                
                // Speciální renderování pro timeBasedGame switch
                if (isTimeBasedSwitch) {
                  return (
                    <div key={key} className="space-y-4 p-6 rounded-xl border-2 bg-green-50 border-green-200">
                      <Label className="block font-bold text-center text-2xl text-green-800">
                        ⏰ {setting.name}
                      </Label>
                      <div className="bg-white p-6 rounded-lg border border-green-300">
                        <div className="flex items-center justify-center gap-6">
                          <Switch
                            checked={settings[key] || false}
                            onCheckedChange={(checked) => handleSettingChange(key, checked)}
                            className="scale-150 data-[state=checked]:bg-green-600"
                          />
                        </div>
                      </div>
                    </div>
                  );
                }
                
                // Jedna úroveň: nadpis a pod ním rovnou volba, sekce oddělené jen tenkou čarou.
                return (
                  <div key={key} className="space-y-3 pt-6 first:pt-0 border-t first:border-t-0 border-gray-200">
                    <Label className="block font-bold text-lg text-[#4e5871]">
                      {isNumberRange ? '🔢 ' : ''}{setting.name}
                    </Label>
                    {renderSettingInput(key, setting, true)}
                  </div>
                );
              })}
              {/* Hra bez základních voleb (modely): „pokročilé“ volby jsou jediné, patří rovnou sem. */}
              {sortedBasicSettings.length === 0
                ? Object.entries(advancedSettings).map(([key, setting]) => renderFlatSetting(key, setting, true))
                : null}
            </CardContent>
          </Card>

          {/* 2. Pokročilá nastavení – tlačítko i obsah v jedné kartě */}
          {sortedBasicSettings.length > 0 && Object.keys(advancedSettings).length > 0 && (
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <div className={FOLD_CARD}>
                <CollapsibleTrigger asChild>
                  <button type="button" className={FOLD_TRIGGER}>
                    <Settings2 className="w-5 h-5 flex-shrink-0" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>Pokročilá nastavení</span>
                      <span className="text-sm font-medium text-gray-500">Ve většině případů není potřeba je měnit</span>
                    </span>
                    <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-6 pb-6 pt-5 space-y-6 border-t border-gray-200 mx-0">
                    {Object.entries(advancedSettings).map(([key, setting]) => renderFlatSetting(key, setting, false))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}

          {/* 3. Sdílet konfiguraci – tlačítko i obsah v jedné kartě */}
          <Collapsible open={isShareOpen} onOpenChange={setIsShareOpen}>
            <div className={FOLD_CARD}>
              <CollapsibleTrigger asChild>
                <button type="button" className={FOLD_TRIGGER}>
                  <Link2 className="w-5 h-5 flex-shrink-0" />
                  <span className="flex flex-col items-start leading-tight">
                    <span>Sdílet konfiguraci</span>
                    <span className="text-sm font-medium text-gray-500">Odkaz nebo QR kód s tímto nastavením</span>
                  </span>
                  <ChevronDown className={`w-5 h-5 ml-auto transition-transform ${isShareOpen ? 'rotate-180' : ''}`} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-6 pb-6 pt-5 space-y-4 border-t border-gray-200">
                  <ShareConfigQr url={generatedUrl} />
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="text-xs text-gray-600 mb-2">Odkaz s nastavením:</div>
                    <div className="text-xs font-mono break-all text-gray-800 bg-white p-2 rounded border">
                      {generatedUrl}
                    </div>
                  </div>
                  
                  <div className="flex gap-3">
                    <Button 
                      onClick={handleCopyUrl}
                      variant="outline"
                      className="flex-1 text-sm py-3"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Kopírovat
                    </Button>
                    
                    <Button 
                      onClick={() => window.open(generatedUrl, '_blank')}
                      variant="outline"
                      className="flex-1 text-sm py-3"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Otevřít
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        </div>
      </div>
    </div>
  );
}