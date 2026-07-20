import React from 'react';
import { motion } from 'framer-motion';

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  duration?: number;
  className?: string;
  style?: React.CSSProperties;
  once?: boolean;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  duration = 0.5,
  className = '',
  style = {},
  once = false,
}: ScrollRevealProps) {
  const getInitialOffset = () => {
    switch (direction) {
      case 'up': return { y: 35, x: 0 };
      case 'down': return { y: -35, x: 0 };
      case 'left': return { x: 35, y: 0 };
      case 'right': return { x: -35, y: 0 };
      case 'none': return { x: 0, y: 0 };
      default: return { y: 35, x: 0 };
    }
  };

  const offset = getInitialOffset();

  return (
    <motion.div
      initial={{ opacity: 0, ...offset, scale: direction === 'none' ? 0.95 : 1 }}
      whileInView={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      viewport={{ once, amount: 0.15 }}
      transition={{
        duration,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export default ScrollReveal;
