
import React from "react";

type MotionProps = {
  children: React.ReactNode;
  className?: string;
  initial?: object;
  animate?: object;
  transition?: object;
  whileHover?: object;
  whileTap?: object;
  variants?: object;
};

// This is a simple wrapper for adding motion effects
// In a real implementation, you might use framer-motion
export const motion = {
  div: ({ 
    children,
    className,
    initial,
    animate,
    transition,
    whileHover,
    whileTap,
    variants,
    ...props 
  }: MotionProps & React.HTMLAttributes<HTMLDivElement>) => {
    return (
      <div 
        className={`transition-all duration-300 ${className || ''}`}
        {...props}
      >
        {children}
      </div>
    );
  }
};
