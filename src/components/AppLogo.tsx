import { Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
}

export const AppLogo = ({ size = 'md', className, showText = false }: AppLogoProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24'
  };

  const textSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
    xl: 'text-4xl'
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative">
        {/* Background gradient circle */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-primary to-primary/60 rounded-2xl blur-xl opacity-20",
          sizeClasses[size]
        )} />
        
        {/* Icon container */}
        <div className={cn(
          "relative bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg",
          sizeClasses[size]
        )}>
          <Download className={cn(
            "text-white",
            size === 'sm' && 'h-4 w-4',
            size === 'md' && 'h-6 w-6',
            size === 'lg' && 'h-8 w-8',
            size === 'xl' && 'h-12 w-12'
          )} />
        </div>
      </div>
      
      {showText && (
        <span className={cn(
          "font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent",
          textSizeClasses[size]
        )}>
          En Garde
        </span>
      )}
    </div>
  );
};