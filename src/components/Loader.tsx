import { motion } from 'motion/react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
}

export function Loader({ size = 'md', fullScreen = false }: LoaderProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4',
  };

  const containerClasses = fullScreen
    ? 'min-h-screen bg-[#05070B] flex flex-col items-center justify-center text-white'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className="relative">
        {/* Pulsing glow behind the loader */}
        <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse" />
        
        {/* Spinning Outer Ring */}
        <motion.div
          className={`${sizeClasses[size]} border-blue-500/10 border-t-blue-500 border-r-blue-500 rounded-full`}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        />
        
        {/* Spinning Inner Ring */}
        <motion.div
          className="absolute inset-2 border-transparent border-t-cyan-400 border-l-cyan-400 rounded-full"
          style={{ transformOrigin: 'center' }}
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
        />
      </div>
      
      {fullScreen && (
        <motion.div 
          className="mt-6 font-sans text-sm text-blue-400/80 tracking-widest font-semibold uppercase"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          ZENIT SMM
        </motion.div>
      )}
    </div>
  );
}

export default Loader;
