import React, { useMemo } from 'react';

const GlowingBackground = () => {
  // Generate random static stars/dust particles so they don't jump around on re-renders
  const particles = useMemo(() => {
    return Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      cx: `${Math.random() * 100}%`,
      cy: `${Math.random() * 100}%`,
      r: Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.8 + 0.2,
      animDuration: `${Math.random() * 3 + 2}s`,
      animDelay: `${Math.random() * 2}s`,
    }));
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[var(--bg-main)] dark:bg-[var(--bg-main)] transition-colors duration-300">
      
      {/* Dark Theme: Background Glow Removed */}
      <div 
        className="absolute inset-0 hidden dark:block transition-opacity duration-300"
        style={{
          background: 'none'
        }}
      />
      
      {/* Light Theme: Subtle Gold ambient glow */}
      <div 
        className="absolute inset-0 block dark:hidden transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at 50% 0%, rgba(217, 154, 0, 0.12) 0%, transparent 60%)'
        }}
      />


      
      {/* Subtle overlay to ensure text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-main)] dark:to-[var(--bg-main)] transition-colors duration-300 pointer-events-none" />
    </div>
  );
};

export default GlowingBackground;
