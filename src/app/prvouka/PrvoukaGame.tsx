import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Volume2 } from 'lucide-react';
import { GameResultScreen } from '../components/GameResultScreen';
import { findPrvoukaGame, defaultPrvoukaTopics } from './data/catalog';
import { composeRound, createRandom, shuffle } from './data/random';
import { canSpeak, speakCzech, stopSpeaking } from './data/speech';
import type { PrvoukaChoiceOption, PrvoukaGame as PrvoukaGameData, PrvoukaGrade, PrvoukaOrderItem, PrvoukaQuestion } from './data/types';
import { usePrvoukaIllustrations, type IllustrationLookup } from './illustrations';
import {
  BOX_PALETTES,
  PRVOUKA_COLORS,
  PrvoukaBox,
  PrvoukaClock,
  PrvoukaFeedbackOverlay,
  PrvoukaPictureView,
  PrvoukaProgress,
  useDesktopScale,
  useIsMobile,
  type BoxPalette,
} from './PrvoukaKit';
import { PrvoukaBoardView, type BoardItemState } from './PrvoukaBoards';

const MAX_LIVES = 3;

export interface PrvoukaGameProps {
  /** Id hry z `data/catalog.ts` (zvirata, ovoce-zelenina, hodiny, rok-a-den, bezpecnost). */
  prvoukaGameId: string;
  /** Barva plochy, když odkaz nemá nastavení (z registru, stejná jako výchozí v konfigurátoru). */
  defaultBackground?: string;
  /** Ročník, když ho odkaz nenastavuje (hry 3. ročníku mají 3). */
  defaultGrade?: PrvoukaGrade;
  settings?: Record<string, any>;
}

function buildRound(game: PrvoukaGameData, grade: PrvoukaGrade, topics: string[], count: number, seed: number): PrvoukaQuestion[] {
  const random = createRandom(seed);
  const pool = game.buildPool({ grade, topics, random });
  return composeRound(pool, count, random).map((question) => {
    if (question.task.kind === 'choice' && (question.task.layout === 'grid' || question.task.layout === 'pictures')) {
      return { ...question, task: { ...question.task, options: shuffle(question.task.options, random) } };
    }
    return question;
  });
}

/** Co se přečte po klepnutí na reproduktor: zadání, popisek a textové možnosti. */
function spokenText(question: PrvoukaQuestion): string {
  const parts = [question.prompt];
  if (question.caption) parts.push(question.caption);
  const { task } = question;
  if (task.kind === 'choice' && task.layout !== 'yesno') {
    const labels = task.options.map((option) => option.label).filter(Boolean);
    if (labels.length > 0) parts.push(labels.join(', nebo '));
  }
  if (task.kind === 'order') parts.push(task.items.map((item) => item.label).join(', '));
  return parts.map((part) => part.replace(/[.?!]+$/, '')).join('. ') + '.';
}

/**
 * Jedna prvouková minihra. Chová se jako Rozřaď čísla: kolo má daný počet úloh,
 * chyba stojí srdíčko (bez opravy, jde se dál), po třech chybách hra končí.
 */
export function PrvoukaGame({ prvoukaGameId, defaultBackground, defaultGrade, settings }: PrvoukaGameProps) {
  const game = findPrvoukaGame(prvoukaGameId);
  const requestedGrade = Number(settings?.grade);
  const grade: PrvoukaGrade = requestedGrade === 1 || requestedGrade === 2 || requestedGrade === 3 ? requestedGrade : defaultGrade ?? 1;
  const rounds = Math.max(3, Math.min(30, Number(settings?.rounds) || 10));
  const backgroundColor = settings?.backgroundColor || defaultBackground || PRVOUKA_COLORS.PAGE_BG;
  const topics: string[] = useMemo(() => {
    if (!game) return [];
    const chosen = Array.isArray(settings?.topics) ? settings.topics.filter((id: string) => game.topics.some((topic) => topic.id === id)) : [];
    return chosen.length > 0 ? chosen : defaultPrvoukaTopics(game, grade);
  }, [game, grade, settings?.topics]);

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const questions = useMemo(() => (game ? buildRound(game, grade, topics, rounds, seed) : []), [game, grade, topics, rounds, seed]);
  const illustrations = usePrvoukaIllustrations();
  const isMobile = useIsMobile();
  const s = useDesktopScale();

  const [index, setIndex] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [feedback, setFeedback] = useState<{ isCorrect: boolean; hint?: string } | null>(null);
  const [locked, setLocked] = useState(false);
  const [result, setResult] = useState<'success' | 'failure' | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const livesRef = useRef(lives);
  livesRef.current = lives;

  useEffect(() => () => stopSpeaking(), []);
  useEffect(() => stopSpeaking(), [index]);

  const question = questions[index];
  const total = questions.length;

  const answer = useCallback((isCorrect: boolean) => {
    if (locked || !question) return;
    setLocked(true);
    if (!isCorrect) setLives((value) => Math.max(0, value - 1));
    else setCorrectCount((value) => value + 1);
    setFeedback({ isCorrect, hint: question.hint });
  }, [locked, question]);

  const afterFeedback = useCallback(() => {
    setFeedback(null);
    const outOfLives = livesRef.current <= 0;
    if (outOfLives || index + 1 >= total) {
      setResult(outOfLives ? 'failure' : 'success');
      return;
    }
    setIndex((value) => value + 1);
    setLocked(false);
  }, [index, total]);

  const restart = () => {
    setSeed(Math.floor(Math.random() * 1e9));
    setIndex(0);
    setLives(MAX_LIVES);
    setCorrectCount(0);
    setFeedback(null);
    setLocked(false);
    setResult(null);
  };

  if (!game || !question) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center p-6 text-center" style={{ backgroundColor, color: PRVOUKA_COLORS.TEXT }}>
        <p className="text-2xl font-bold">Pro zvolená témata tu zatím nejsou žádné úlohy.</p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col overflow-hidden" style={{ backgroundColor, height: '100svh', color: PRVOUKA_COLORS.TEXT }}>
      {/* Zadání je ve všech hrách na stejném místě nahoře, úloha se centruje do zbylého prostoru
          a postup je vždy dole – při přepínání úloh a her nic neposkakuje. */}
      <div className="flex-1 flex flex-col items-center gap-4 sm:gap-6 px-3 sm:px-6 md:px-8 min-h-0" style={{ paddingTop: isMobile ? 16 : 20 * s, paddingBottom: isMobile ? 24 : settings ? Math.max(76, 64 * s) : 28 * s }}>
        <div className="flex items-center justify-center gap-3 text-center flex-shrink-0" style={{ maxWidth: '92vw', minHeight: isMobile ? 56 : 64 * s }}>
          <h1 style={{ fontSize: isMobile ? 26 : 46 * s, fontWeight: 700, lineHeight: 1.15, color: PRVOUKA_COLORS.TEXT }}>{question.prompt}</h1>
          {canSpeak() ? (
            <button
              type="button"
              onClick={() => speakCzech(spokenText(question))}
              className="flex-shrink-0 rounded-full flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
              style={{ width: isMobile ? 40 : 52 * s, height: isMobile ? 40 : 52 * s, backgroundColor: '#fff', border: `3px solid ${PRVOUKA_COLORS.CARD_BORDER}`, color: PRVOUKA_COLORS.TEXT }}
              aria-label="Přečíst nahlas"
            >
              <Volume2 size={isMobile ? 20 : 26 * s} />
            </button>
          ) : null}
        </div>

        <FitToSpace>
          <QuestionView key={`${seed}:${index}`} question={question} illustrations={illustrations} locked={locked} onAnswer={answer} />
        </FitToSpace>

        <div className="flex-shrink-0">
          <PrvoukaProgress current={index + 1} total={total} lives={lives} maxLives={MAX_LIVES} />
        </div>
      </div>

      <AnimatePresence>
        {feedback ? <PrvoukaFeedbackOverlay isCorrect={feedback.isCorrect} hint={feedback.hint} onComplete={afterFeedback} /> : null}
      </AnimatePresence>

      {result ? (
        <GameResultScreen
          isSuccess={result === 'success'}
          onContinue={restart}
          successText={['Skvělá práce! 🎯', 'Výborně! ⭐', 'Perfektní! 🏆', 'Máš to! 🌟'][seed % 4]}
          failureText={['Zkus to znovu! 🤔', 'Další pokus! 💪', 'Neboj se, zvládneš to! 🌟'][seed % 3]}
          showContinueButton
          displayType="gameComplete"
          // Při prohře (došla srdíčka) se počítá jen z úloh, které dítě stihlo.
          score={{ correct: correctCount, total: result === 'success' ? total : index + 1 }}
        />
      ) : null}
    </div>
  );
}

/**
 * Úloha vyplní prostor mezi zadáním a skóre. Když je okno nízké (notebook, rozdělená
 * obrazovka), celá se zmenší, aby skóre dole zůstalo vidět.
 */
function FitToSpace({ children }: { children: React.ReactNode }) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(1);

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;
    const measure = () => {
      // offsetWidth/Height nejsou ovlivněné transformací, měří se přirozená velikost.
      const needH = inner.offsetHeight;
      const needW = inner.offsetWidth;
      if (!needH || !needW) return;
      const next = Math.min(1, outer.clientHeight / needH, outer.clientWidth / needW);
      setFit((prev) => (Math.abs(prev - next) > 0.01 ? next : prev));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(outer);
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={outerRef} className="flex-1 w-full min-h-0 relative flex items-center justify-center">
      <div
        ref={innerRef}
        className="flex flex-col items-center justify-center w-full"
        style={{ transform: fit < 1 ? `scale(${fit})` : undefined, transformOrigin: 'center center', flexShrink: 0 }}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ úlohy */

interface QuestionViewProps {
  question: PrvoukaQuestion;
  illustrations: IllustrationLookup;
  locked: boolean;
  onAnswer: (isCorrect: boolean) => void;
}

function QuestionView({ question, illustrations, locked, onAnswer }: QuestionViewProps) {
  const { task } = question;
  if (task.kind === 'choice' && task.layout === 'baskets') {
    return <SortView question={question} options={task.options} illustrations={illustrations} locked={locked} onAnswer={onAnswer} />;
  }
  if (task.kind === 'choice') {
    return <ChoiceView question={question} options={task.options} layout={task.layout} illustrations={illustrations} locked={locked} onAnswer={onAnswer} />;
  }
  if (task.kind === 'order') {
    return <OrderView items={task.items} illustrations={illustrations} locked={locked} onAnswer={onAnswer} />;
  }
  if (task.kind === 'clock-set') {
    return <ClockView question={question} hour={task.hour} minute={task.minute} step={task.step} show24={task.show24} illustrations={illustrations} locked={locked} onAnswer={onAnswer} />;
  }
  return <BoardView question={question} illustrations={illustrations} locked={locked} onAnswer={onAnswer} />;
}

/** Bílá kartička s obrázkem a popiskem – jako kartička v Rozřaď čísla. */
function ItemCard({ question, illustrations, size }: { question: PrvoukaQuestion; illustrations: IllustrationLookup; size: number }) {
  if (!question.picture && !question.caption) return null;
  const hasPicture = Boolean(question.picture);
  const isStatement = !hasPicture || question.captionStyle === 'bubble';
  if (isStatement && question.caption) {
    return (
      <div className="flex items-center gap-3 sm:gap-5 max-w-3xl">
        {hasPicture && question.picture ? <PrvoukaPictureView picture={question.picture} illustrations={illustrations} size={size * 0.6} height={size * 0.8} /> : null}
        <div
          className="text-center"
          style={{
            backgroundColor: PRVOUKA_COLORS.CARD_BG,
            border: `3px solid ${PRVOUKA_COLORS.CARD_BORDER}`,
            borderRadius: 24,
            padding: `${size * 0.045}px ${size * 0.065}px`,
            // Delší popis (např. planeta z kartičky v učebnici) menším písmem a do šířky.
            fontSize: Math.max(22, size * (question.caption.length > 40 ? 0.065 : 0.07)),
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {question.caption}
        </div>
      </div>
    );
  }
  // Obrázek vyplní skoro celou kartu, na výšku 4 : 3 – fotky na šířku nebudou malé.
  const pictureWidth = size * 0.92;
  const pictureHeight = size * (question.caption ? 0.7 : 0.8);
  return (
    <div
      className="flex flex-col items-center justify-center"
      style={{
        width: size,
        backgroundColor: PRVOUKA_COLORS.CARD_BG,
        border: `${size < 100 ? 2 : 3}px solid ${PRVOUKA_COLORS.CARD_BORDER}`,
        borderRadius: size < 100 ? 8 : 16,
        padding: size * 0.04,
        gap: size * 0.02,
      }}
    >
      {question.picture ? <PrvoukaPictureView picture={question.picture} illustrations={illustrations} size={pictureWidth} height={pictureHeight} /> : null}
      {question.caption ? (
        <div style={{ fontSize: Math.max(18, size * 0.075), fontWeight: 700, lineHeight: 1.1, textAlign: 'center', paddingBottom: size * 0.02 }}>{question.caption}</div>
      ) : null}
    </div>
  );
}

const SORT_PALETTES: BoxPalette[] = [BOX_PALETTES.green, BOX_PALETTES.orange, BOX_PALETTES.blue, BOX_PALETTES.purple];

/** Třídění: kartička nahoře sjede do zvolené krabice (jako Rozřaď čísla). */
function SortView({ question, options, illustrations, locked, onAnswer }: { question: PrvoukaQuestion; options: PrvoukaChoiceOption[]; illustrations: IllustrationLookup; locked: boolean; onAnswer: (ok: boolean) => void }) {
  const isMobile = useIsMobile();
  const s = useDesktopScale();
  const [target, setTarget] = useState<string | null>(null);
  const [sliding, setSliding] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boxRefs = useRef(new Map<string, HTMLDivElement>());
  const boxSize = isMobile ? (options.length > 3 ? 80 : options.length > 2 ? 104 : 140) : (options.length > 3 ? 170 : options.length > 2 ? 190 : 200) * s;
  const cardSize = isMobile ? 190 : 260 * s;
  const labelLength = Math.max(...options.flatMap((option) => option.label.split(' ').map((word) => word.length)));

  const choose = (option: PrvoukaChoiceOption) => {
    if (locked || target) return;
    setTarget(option.id);
    setTimeout(() => {
      setSliding(true);
      setTimeout(() => onAnswer(option.correct), 700);
    }, 550);
  };

  const offsetX = () => {
    const box = target ? boxRefs.current.get(target) : null;
    const container = containerRef.current;
    if (!box || !container) return 0;
    const boxRect = box.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    return boxRect.left + boxRect.width / 2 - (containerRect.left + containerRect.width / 2);
  };

  return (
    <div ref={containerRef} className="relative flex flex-col items-center w-full" style={{ gap: isMobile ? 16 : 32 * s }}>
      <motion.div
        style={{ zIndex: sliding ? 5 : 50 }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ x: target ? offsetX() : 0, y: sliding ? (isMobile ? 150 : 260 * s) : 0, scale: sliding ? 0.6 : 1, opacity: sliding ? 0 : 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <ItemCard question={question} illustrations={illustrations} size={cardSize} />
      </motion.div>
      <div className="flex items-end justify-center w-full px-2" style={{ gap: isMobile ? 10 : 48 * s }}>
        {options.map((option, position) => (
          <div
            key={option.id}
            ref={(element) => {
              if (element) boxRefs.current.set(option.id, element);
              else boxRefs.current.delete(option.id);
            }}
            className="flex-shrink-0"
          >
            <PrvoukaBox
              label={option.label}
              palette={SORT_PALETTES[position % SORT_PALETTES.length]}
              size={boxSize}
              onClick={() => choose(option)}
              isHighlighted={target === option.id}
              labelLength={labelLength}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Výběr odpovědi: velká kartička s obrázkem, pod ní karty s možnostmi. */
function ChoiceView({
  question,
  options,
  layout,
  illustrations,
  locked,
  onAnswer,
}: {
  question: PrvoukaQuestion;
  options: PrvoukaChoiceOption[];
  layout: 'grid' | 'yesno' | 'pictures';
  illustrations: IllustrationLookup;
  locked: boolean;
  onAnswer: (ok: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const s = useDesktopScale();
  const [chosen, setChosen] = useState<string | null>(null);
  const choose = (option: PrvoukaChoiceOption) => {
    if (locked || chosen) return;
    setChosen(option.id);
    setTimeout(() => onAnswer(option.correct), 350);
  };
  const cardSize = isMobile ? 260 : 420 * s;

  if (layout === 'yesno') {
    return (
      <div className="flex flex-col items-center w-full" style={{ gap: isMobile ? 18 : 32 * s }}>
        <ItemCard question={question} illustrations={illustrations} size={cardSize} />
        <div className="flex justify-center" style={{ gap: isMobile ? 16 : 40 * s }}>
          {options.map((option) => {
            const yes = option.id === 'ano';
            const palette = yes ? BOX_PALETTES.green : BOX_PALETTES.pink;
            return (
              <motion.button
                key={option.id}
                type="button"
                onClick={() => choose(option)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ scale: chosen === option.id ? 1.08 : 1 }}
                className="flex flex-col items-center justify-center"
                style={{
                  width: isMobile ? 130 : 200 * s,
                  height: isMobile ? 120 : 170 * s,
                  borderRadius: 24,
                  backgroundColor: palette.front,
                  border: `4px solid ${palette.border}`,
                  color: palette.border,
                  boxShadow: `0 6px 0 ${palette.border}`,
                }}
              >
                <span style={{ fontSize: isMobile ? 48 : 72 * s, lineHeight: 1, fontWeight: 800 }}>{yes ? '✓' : '✗'}</span>
                <span style={{ fontSize: isMobile ? 24 : 32 * s, fontWeight: 700 }}>{option.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    );
  }

  const pictures = layout === 'pictures';
  // Dlouhý popis vedle možností by se nevešel – obrázek s popisem nahoru, možnosti pod ně.
  const stacked = pictures || (question.caption?.length ?? 0) > 40;
  return (
    <div className={`flex items-center justify-center w-full ${stacked ? 'flex-col' : 'flex-col lg:flex-row'}`} style={{ gap: isMobile ? 18 : (stacked ? 24 : 40) * s }}>
      {question.picture || question.caption ? <ItemCard question={question} illustrations={illustrations} size={stacked && !pictures ? cardSize * 0.75 : cardSize} /> : null}
      <div
        className="grid w-full"
        style={{
          gap: isMobile ? 10 : 16 * s,
          // Čtyři možnosti ve dvou sloupcích potřebují víc místa, jinak se delší odpověď láme.
          maxWidth: (pictures ? 820 : options.length === 4 ? 760 : 560) * (isMobile ? 1 : s),
          gridTemplateColumns: pictures ? `repeat(${options.length}, minmax(0, 1fr))` : options.length === 4 && !isMobile ? 'repeat(2, minmax(0, 1fr))' : '1fr',
          // Všechny kartičky stejně vysoké – když se jedna zalomí, ostatní se srovnají s ní.
          gridAutoRows: '1fr',
        }}
      >
        {options.map((option) => (
          <motion.button
            key={option.id}
            type="button"
            onClick={() => choose(option)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            animate={{ scale: chosen === option.id ? 1.05 : 1 }}
            className={`flex flex-col items-center text-center ${pictures ? 'justify-start' : 'justify-center'}`}
            style={{
              minHeight: pictures ? undefined : isMobile ? 56 : 84 * s,
              padding: pictures ? 10 : '12px 18px',
              borderRadius: 18,
              backgroundColor: chosen === option.id ? '#FFF4E3' : PRVOUKA_COLORS.CARD_BG,
              border: `3px solid ${chosen === option.id ? PRVOUKA_COLORS.TEXT : PRVOUKA_COLORS.CARD_BORDER}`,
              color: PRVOUKA_COLORS.TEXT,
              fontSize: isMobile ? 20 : 30 * s,
              fontWeight: 700,
              lineHeight: 1.2,
              textWrap: 'balance',
              boxShadow: `0 4px 0 ${PRVOUKA_COLORS.CARD_BORDER}`,
            }}
          >
            {option.picture ? <PrvoukaPictureView picture={option.picture} illustrations={illustrations} size={isMobile ? 96 : 200 * s} height={isMobile ? 84 : 170 * s} /> : null}
            {option.label ? (
              pictures ? (
                // Popisek má vždy místo na dva řádky, aby obrázky v řadě zůstaly ve stejné výšce.
                <span className="flex items-center justify-center" style={{ fontSize: isMobile ? 16 : 20 * s, minHeight: `${2 * 1.2}em`, marginTop: 4 }}>{option.label}</span>
              ) : (
                <span>{option.label}</span>
              )
            ) : null}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/** Nastav hodiny: velké hodiny s ručičkami na tažení a kulaté potvrzovací tlačítko. */
function ClockView({
  question,
  hour,
  minute,
  step,
  show24,
  illustrations,
  locked,
  onAnswer,
}: {
  question: PrvoukaQuestion;
  hour: number;
  minute: number;
  step: number;
  show24?: boolean;
  illustrations: IllustrationLookup;
  locked: boolean;
  onAnswer: (ok: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const s = useDesktopScale();
  // Ručičky začínají jinde než cíl a nikdy ne na sobě (12:00 by byla jedna čára).
  const [time, setTime] = useState(() => {
    const startMinute = (minute + (step >= 30 ? 30 : 20)) % 60;
    let startHour = (hour + 4) % 12;
    if (Math.abs(startHour * 5 - startMinute) < 5 || (startHour === 0 && startMinute === 0)) startHour = (startHour + 3) % 12;
    return { hour: startHour, minute: startMinute };
  });
  const size = isMobile ? 260 : 430 * s;
  const buttonSize = isMobile ? 64 : 84 * s;
  return (
    <div className="flex flex-col lg:flex-row items-center justify-center" style={{ gap: isMobile ? 16 : 48 * s }}>
      {question.picture ? (
        <PrvoukaPictureView picture={question.picture} illustrations={illustrations} size={isMobile ? 200 : 300 * s} height={isMobile ? 140 : 220 * s} />
      ) : (
        // Prázdné místo stejně široké jako tlačítko vpravo – ciferník tak stojí přesně uprostřed.
        <div className="hidden lg:block flex-shrink-0" style={{ width: buttonSize }} aria-hidden="true" />
      )}
      <div className="flex flex-col items-center" style={{ gap: 14 }}>
        <PrvoukaClock
          hour={time.hour}
          minute={time.minute}
          size={size}
          step={step}
          show24={show24}
          onChange={(nextHour, nextMinute) => !locked && setTime({ hour: nextHour, minute: nextMinute })}
        />
        <p style={{ fontSize: isMobile ? 15 : 18 * s, fontWeight: 600, opacity: 0.8 }}>Táhni za ručičky – malá ukazuje hodiny, velká minuty.</p>
      </div>
      <motion.button
        type="button"
        onClick={() => !locked && onAnswer(time.hour % 12 === hour % 12 && time.minute === minute)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        className="rounded-full flex items-center justify-center text-white"
        style={{ width: buttonSize, height: buttonSize, backgroundColor: '#2C3F98', fontSize: isMobile ? 32 : 44 * s, fontWeight: 800, boxShadow: '0 5px 0 #1d2a6b', flexShrink: 0 }}
        aria-label="Hotovo"
      >
        ✓
      </motion.button>
    </div>
  );
}

/** Kruh měsíců, roční období, týden, části dne. */
function BoardView({ question, illustrations, locked, onAnswer }: { question: PrvoukaQuestion; illustrations: IllustrationLookup; locked: boolean; onAnswer: (ok: boolean) => void }) {
  const isMobile = useIsMobile();
  const s = useDesktopScale();
  const task = question.task as Extract<PrvoukaQuestion['task'], { kind: 'board' }>;
  const size = task.board === 'months' ? 12 : task.board === 'week' ? 7 : task.board === 'dayparts' ? 6 : 4;
  const multi = task.mode === 'all' && task.correct.length > 1;
  const [selected, setSelected] = useState<number[]>([]);

  const tap = (item: number) => {
    if (locked) return;
    if (!multi) {
      setSelected([item]);
      setTimeout(() => onAnswer(task.correct.includes(item)), 300);
      return;
    }
    setSelected((list) => (list.includes(item) ? list.filter((value) => value !== item) : [...list, item]));
  };

  const confirm = () => {
    if (locked || selected.length === 0) return;
    onAnswer(selected.length === task.correct.length && selected.every((item) => task.correct.includes(item)));
  };

  const states: BoardItemState[] = Array.from({ length: size }, (_, item) => (selected.includes(item) ? 'selected' : 'idle'));
  return (
    <div className="flex flex-col lg:flex-row items-center justify-center w-full" style={{ gap: isMobile ? 16 : 40 * s }}>
      {question.picture || question.caption ? <ItemCard question={question} illustrations={illustrations} size={isMobile ? 220 : 340 * s} /> : null}
      <div className="flex flex-col items-center w-full" style={{ gap: 16, maxWidth: (task.board === 'months' ? 620 : 1000) * (isMobile ? 1 : s) }}>
        <PrvoukaBoardView board={task.board} states={states} onTap={tap} disabled={locked} illustrations={illustrations} />
        {multi ? (
          <motion.button
            type="button"
            onClick={confirm}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            disabled={selected.length === 0}
            className="rounded-full flex items-center justify-center text-white disabled:opacity-40"
            style={{ width: 72 * (isMobile ? 1 : s), height: 72 * (isMobile ? 1 : s), backgroundColor: '#2C3F98', fontSize: 38 * (isMobile ? 1 : s), fontWeight: 800, boxShadow: '0 5px 0 #1d2a6b' }}
            aria-label="Hotovo"
          >
            ✓
          </motion.button>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Seřaď: nahoře očíslovaná místa, dole zamíchané kartičky. Klepnutí na kartičku, která
 * patří na řadu, ji posadí na místo; jiná kartička zatřese a ukáže nápovědu.
 * Úloha je správně, když dítě seřadí vše bez chyby.
 */
function OrderView({ items, illustrations, locked, onAnswer }: { items: PrvoukaOrderItem[]; illustrations: IllustrationLookup; locked: boolean; onAnswer: (ok: boolean) => void }) {
  const isMobile = useIsMobile();
  const s = useDesktopScale();
  const [placed, setPlaced] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [shaking, setShaking] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [pool] = useState(() => shuffle(items, Math.random));
  const done = placed >= items.length;
  const slotWidth = isMobile ? 76 : Math.min(150, 1000 / items.length) * s;
  const pictureSize = isMobile ? 48 : slotWidth * 0.62;

  const tap = (item: PrvoukaOrderItem) => {
    if (locked || done) return;
    const wanted = items[placed];
    if (item.id === wanted.id) {
      const next = placed + 1;
      setPlaced(next);
      setHint(null);
      if (next >= items.length) setTimeout(() => onAnswer(mistakes === 0), 450);
      return;
    }
    setMistakes((value) => value + 1);
    setShaking(item.id);
    setHint(wanted.hint ?? null);
    setTimeout(() => setShaking(null), 450);
  };

  const card = (item: PrvoukaOrderItem, width: number) => (
    <>
      {item.picture ? <PrvoukaPictureView picture={item.picture} illustrations={illustrations} size={pictureSize} /> : null}
      <span style={{ fontSize: isMobile ? 14 : Math.max(15, 19 * s), fontWeight: 700, lineHeight: 1.15, maxWidth: width - 8, textAlign: 'center' }}>{item.label}</span>
    </>
  );

  return (
    <div className="flex flex-col items-center w-full" style={{ gap: isMobile ? 14 : 26 * s, maxWidth: '96vw' }}>
      <div className="flex flex-wrap justify-center" style={{ gap: isMobile ? 6 : 12 * s }}>
        {items.map((item, position) => {
          const filled = position < placed;
          return (
            <div
              key={item.id}
              className="flex flex-col items-center justify-center"
              style={{
                width: slotWidth,
                minHeight: slotWidth * 1.15,
                borderRadius: 16,
                border: `3px ${filled ? 'solid' : 'dashed'} ${filled ? BOX_PALETTES.green.border : PRVOUKA_COLORS.CARD_BORDER}`,
                backgroundColor: filled ? BOX_PALETTES.green.front : 'rgba(255,255,255,0.5)',
                gap: 4,
                padding: 4,
              }}
            >
              <span style={{ fontSize: isMobile ? 13 : 17 * s, fontWeight: 700, opacity: 0.7 }}>{position + 1}.</span>
              {filled ? card(item, slotWidth) : null}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center" style={{ gap: isMobile ? 8 : 14 * s, minHeight: slotWidth * 1.1 }}>
        {pool.filter((item) => items.findIndex((x) => x.id === item.id) >= placed).map((item) => (
          <motion.button
            key={item.id}
            type="button"
            onClick={() => tap(item)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            animate={shaking === item.id ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center justify-center"
            style={{
              width: slotWidth,
              minHeight: slotWidth * 1.05,
              borderRadius: 16,
              backgroundColor: PRVOUKA_COLORS.CARD_BG,
              border: `3px solid ${shaking === item.id ? '#FF4D6D' : PRVOUKA_COLORS.CARD_BORDER}`,
              boxShadow: `0 4px 0 ${PRVOUKA_COLORS.CARD_BORDER}`,
              color: PRVOUKA_COLORS.TEXT,
              gap: 4,
              padding: 6,
            }}
          >
            {card(item, slotWidth)}
          </motion.button>
        ))}
      </div>
      <div style={{ minHeight: isMobile ? 40 : 56 * s, fontSize: isMobile ? 16 : 22 * s, fontWeight: 600, textAlign: 'center', maxWidth: 900 * s }}>
        {hint ? `Tady ještě ne. ${hint}` : null}
      </div>
    </div>
  );
}
