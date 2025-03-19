import { motion } from "framer-motion";

interface CelebrationProps {
  onComplete?: () => void;
  position?: { x: number; y: number };
}

export function Celebration({ onComplete, position }: CelebrationProps) {
  const particles = Array.from({ length: 20 });

  return (
    <div 
      className="fixed pointer-events-none"
      style={{
        left: position?.x ?? '50%',
        top: position?.y ?? '50%',
        transform: position ? 'none' : 'translate(-50%, -50%)'
      }}
    >
      {particles.map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 bg-primary rounded-full"
          initial={{
            opacity: 1,
            scale: 0,
            x: 0,
            y: 0,
          }}
          animate={{
            opacity: 0,
            scale: 1,
            x: Math.random() * 200 - 100,
            y: Math.random() * 200 - 100,
          }}
          transition={{
            duration: 0.8,
            ease: "easeOut",
          }}
          onAnimationComplete={() => {
            if (i === particles.length - 1 && onComplete) {
              onComplete();
            }
          }}
        />
      ))}
    </div>
  );
}