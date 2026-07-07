/**
 * Enhanced Link component that supports forced page reloads
 */

import Link from 'next/link';
import { useEnhancedNavigation } from '@/hooks/useEnhancedNavigation';
import { NavigationOptions } from '@/lib/navigationUtils';
import { ReactNode } from 'react';

interface NavigationLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  forceReload?: boolean;
  replace?: boolean;
  newTab?: boolean;
  onClick?: () => void;
}

export const NavigationLink = ({ 
  href, 
  children, 
  className, 
  forceReload = false,
  replace = false,
  newTab = false,
  onClick
}: NavigationLinkProps) => {
  const { navigate } = useEnhancedNavigation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (onClick) {
      onClick();
    }

    const options: NavigationOptions = {
      forceReload,
      replace,
      newTab
    };

    navigate(href, options);
  };

  return (
    <Link 
      href={href} 
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
};

/**
 * Navigation link that always forces a reload
 */
export const ReloadLink = (props: Omit<NavigationLinkProps, 'forceReload'>) => (
  <NavigationLink {...props} forceReload={true} />
);

/**
 * Navigation link for authenticated routes (forces reload on auth state changes)
 */
export const AuthLink = (props: NavigationLinkProps) => (
  <NavigationLink {...props} forceReload={true} />
);
