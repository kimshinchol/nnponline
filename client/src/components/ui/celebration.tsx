import { motion } from "framer-motion";

interface CelebrationProps {
  onComplete?: () => void;
}

export function Celebration({ onComplete }: CelebrationProps) {
  const particles = Array.from({ length: 20 });

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
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
            x: Math.random() * 400 - 200,
            y: Math.random() * 400 - 200,
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
