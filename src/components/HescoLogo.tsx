import React from 'react';

interface HescoLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

const HescoLogo: React.FC<HescoLogoProps> = ({ 
  size = 'md', 
  showText = true, 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-auto',
    md: 'h-8 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto'
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <img 
        src="/hesco-logo.svg" 
        alt="HESCOTECH Logo" 
        className={sizeClasses[size]}
      />
      {showText && (
        <span className={`font-bold ${
          size === 'sm' ? 'text-sm' :
          size === 'md' ? 'text-lg' :
          size === 'lg' ? 'text-xl' :
          'text-2xl'
        }`}>
          HESCOTECH
        </span>
      )}
    </div>
  );
};

export default HescoLogo;
