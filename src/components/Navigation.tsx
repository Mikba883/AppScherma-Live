import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, Home } from 'lucide-react';

export const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center gap-2 sm:gap-6">
      <Link to="/">
        <Button 
          variant={isActive('/') ? "default" : "ghost"} 
          size="default"
          className="flex items-center gap-1 sm:gap-2 text-sm px-2 sm:px-4 mobile-button sm:h-10"
        >
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>
      </Link>
      
      <Link to="/consultation">
        <Button 
          variant={isActive('/consultation') ? "secondary" : "outline"} 
          size="default"
          className="flex items-center gap-1 sm:gap-2 text-sm px-2 sm:px-4 font-medium mobile-button sm:h-10"
        >
          <Table className="h-4 w-4" />
          <span className="hidden sm:inline">Consultazione</span>
        </Button>
      </Link>

    </nav>
  );
};