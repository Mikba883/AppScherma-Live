import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, Home } from 'lucide-react';

export const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center gap-1 sm:gap-2 flex-wrap">
      <Link to="/">
        <Button 
          variant={isActive('/') ? "default" : "ghost"} 
          size="sm"
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
        >
          <Home className="h-4 w-4" />
          <span className="hidden xs:inline">Dashboard</span>
        </Button>
      </Link>
      
      <Link to="/consultation">
        <Button 
          variant={isActive('/consultation') ? "secondary" : "outline"} 
          size="sm"
          className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 font-medium border-2"
        >
          <Table className="h-4 w-4" />
          <span className="hidden xs:inline">Consultazione</span>
        </Button>
      </Link>
    </nav>
  );
};