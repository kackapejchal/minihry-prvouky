import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CorrectAnswerOverlay } from './CorrectAnswerOverlay';
import { CelebrationVideo } from './CelebrationVideo';
import { getRandomCelebrationVideo } from '../constants/celebrationVideos';
import { useAudio } from './AudioManager';

type DisplayType = 'gameComplete' | 'correctAnswer';

interface GameResultScreenProps {
  isSuccess: boolean;
  onContinue?: () => void;
  autoHideDuration?: number;
  successText?: string;
  failureText?: string;
  showContinueButton?: boolean;
  displayType?: DisplayType;
  /** Kolik úloh dítě zvládlo – ukáže se pod nápisem (prvoukové minihry). */
  score?: { correct: number; total: number };
}

export function GameResultScreen({ 
  isSuccess, 
  onContinue, 
  autoHideDuration,
  successText = "SPRÁVNĚ!",
  failureText = "ZKUS TO ZNOVU!",
  showContinueButton = true,
  displayType = 'gameComplete',
  score,
}: GameResultScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [selectedVideo] = useState(getRandomCelebrationVideo);
  const { playSound } = useAudio();

  // Přehrání zvuku při zobrazení
  useEffect(() => {
    if (displayType === 'gameComplete') {
      // Pro dokončení hry přehrát oslavný zvuk
      playSound('gameComplete');
    } else {
      // Pro jednotlivé odpovědi přehrát správně/špatně zvuk
      playSound(isSuccess ? 'correct' : 'incorrect');
    }
  }, [isSuccess, displayType, playSound]);

  // Auto-hide funkce
  useEffect(() => {
    if (autoHideDuration && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onContinue) {
          onContinue();
        }
      }, autoHideDuration * 1000);

      return () => clearTimeout(timer);
    }
  }, [autoHideDuration, onContinue]);

  if (!isVisible) return null;

  const handleContinue = () => {
    setIsVisible(false);
    if (onContinue) {
      onContinue();
    }
  };

  if (displayType === 'correctAnswer') {
    return (
      <CorrectAnswerOverlay
        isSuccess={isSuccess}
        successText={successText}
        failureText={failureText}
        autoHideDuration={autoHideDuration}
      />
    );
  }

  // Pro gameComplete typ zobrazíme plnou obrazovku s videem
  return (
    <div 
      className="fixed inset-0 z-50"
      style={{ backgroundColor: selectedVideo.backgroundColor }}
    >
      <CelebrationVideo video={selectedVideo} isSuccess={isSuccess} />

      {/* Hlavní obsah v popředí */}
      <div className="relative z-10 flex flex-col items-center justify-start w-full h-full p-4 sm:p-8 pt-16 sm:pt-24">
        
        {/* Text nahoře */}
        <div className="text-center mb-6 sm:mb-8 bg-[rgba(221,20,20,0)]">
          <motion.div
            animate={{
              rotate: [0, 5, -5, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-6xl sm:text-7xl lg:text-8xl"
            style={{ 
              color: isSuccess ? '#4CAF50' : '#F44336'
            }}
          >
            {isSuccess ? successText : failureText}
          </motion.div>
        </div>

        {/* Výsledek: kolik úloh bylo správně */}
        {score ? (
          <motion.div
            className="mb-5 flex items-baseline gap-3 rounded-full bg-white px-7 py-3"
            style={{ boxShadow: '0 6px 20px rgba(78,88,113,0.15)', color: '#4e5871' }}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 220, damping: 18 }}
          >
            <span className="text-xl sm:text-2xl font-semibold">Správně</span>
            <span className="text-4xl sm:text-5xl font-black" style={{ color: isSuccess ? '#4CAF50' : '#F44336' }}>
              {score.correct}
            </span>
            <span className="text-xl sm:text-2xl font-semibold">z {score.total}</span>
          </motion.div>
        ) : null}

        {/* Tlačítko pokračovat pod textem */}
        {showContinueButton && (
          <motion.button
            onClick={handleContinue}
            // Stejný styl jako tlačítka Všechny hry / Nastavení dole, jen větší – je to hlavní akce obrazovky.
            className="px-10 py-3.5 bg-white hover:bg-[#f4f5fa] rounded-full border-2 border-[#4e5871] text-[#4e5871] font-bold shadow-[0_4px_0_#4e5871] active:translate-y-[4px] active:shadow-none transition-colors"
            whileHover={{ y: -2 }}
          >
            <span className="text-xl">Pokračovat</span>
          </motion.button>
        )}
      </div>

      {/* Auto-hide indikátor */}
      {autoHideDuration && autoHideDuration > 0 && (
        <div className="absolute top-4 right-4 text-gray-600 z-20">
          <div className="bg-white bg-opacity-80 rounded-full px-3 py-1 text-sm">
            Automaticky pokračuje za {autoHideDuration}s
          </div>
        </div>
      )}
    </div>
  );
}