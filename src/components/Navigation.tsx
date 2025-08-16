import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search, Table, Home } from 'lucide-react';

export const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center gap-2">
      <Link to="/">
        <Button 
          variant={isActive('/') ? "default" : "ghost"} 
          size="sm"
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Dashboard
        </Button>
      </Link>
      
      <Link to="/consultation">
        <Button 
          variant={isActive('/consultation') ? "default" : "ghost"} 
          size="sm"
          className="flex items-center gap-2"
        >
          <Search className="h-4 w-4" />
          Consultazione
        </Button>
      </Link>
    </nav>
  );
};