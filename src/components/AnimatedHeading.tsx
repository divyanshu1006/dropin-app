import React from 'react';
import { motion } from 'motion/react';

interface AnimatedHeadingProps {
  /** The text content to split and animate */
  text: string;
  /** Custom classes for tailoring sizes, weights, and color states */
  className?: string;
  /** Base delay in seconds before the animation begins */
  delay?: number;
  /** Delay step in seconds between consecutive characters */
  staggerDelay?: number;
  /** Unique ID reference for the heading element */
  id?: string;
  /** Optional React key for state-switching reset triggers */
  key?: React.Key;
}

/**
 * AnimatedHeading - A beautiful, responsive H3 component designed for heroes and section headers.
 * Implements a complex cinematic entry: sliding up, fading in, and fading out a blur filter
 * on a letter-by-letter basis. Words are preserved intact using inline-blocks to guarantee
 * perfect fluid wrapping on any viewport scale.
 */
export function AnimatedHeading({
  text,
  className = "text-xl md:text-2xl font-sans font-extrabold tracking-tight text-slate-900 transition-colors duration-500 hover:text-orange-500 cursor-default",
  delay = 0,
  staggerDelay = 0.025,
  id
}: AnimatedHeadingProps) {
  // Split words by space to avoid ugly character wrapping mid-word on narrow viewports
  const words = text.split(" ");
  
  // Track global index of characters to keep stagger timing linear across words
  let charCounter = 0;

  return (
    <h3 id={id} className={`${className} inline-flex flex-wrap items-center justify-center`}>
      {words.map((word, wordIdx) => {
        const wordChars = word.split("");
        
        return (
          <span key={`w-${wordIdx}`} className="inline-block whitespace-nowrap">
            {wordChars.map((char, charIdx) => {
              const currentGlobalIndex = charCounter;
              charCounter++;

              return (
                <motion.span
                  key={`c-${wordIdx}-${charIdx}`}
                  initial={{ 
                    opacity: 0, 
                    y: 12, 
                    filter: "blur(6px)" 
                  }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    filter: "blur(0px)" 
                  }}
                  transition={{
                    duration: 0.45,
                    ease: [0.16, 1, 0.3, 1], // Fine-tuned cubic bezier decelerating curve
                    delay: delay + currentGlobalIndex * staggerDelay,
                  }}
                  className="inline-block origin-bottom transform-gpu"
                >
                  {char}
                </motion.span>
              );
            })}
            {/* Render a secure, non-collapsing spacer between words */}
            {wordIdx < words.length - 1 && (
              <span className="inline-block select-none" aria-hidden="true">
                &nbsp;
              </span>
            )}
          </span>
        );
      })}
    </h3>
  );
}

export default AnimatedHeading;
