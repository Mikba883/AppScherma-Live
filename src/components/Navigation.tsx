import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, Home } from 'lucide-react';

export const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="flex items-center gap-4">
      <Link to="/">
        <Button 
          variant={isActive('/') ? "default" : "ghost"} 
          size="default"
          className="flex items-center gap-2 text-sm px-4"
        >
          <Home className="h-4 w-4" />
          <span>Dashboard</span>
        </Button>
      </Link>
      
      <Link to="/consultation">
        <Button 
          variant={isActive('/consultation') ? "secondary" : "outline"} 
          size="default"
          className="flex items-center gap-2 text-sm px-4 font-medium"
        >
          <Table className="h-4 w-4" />
          <span>Consultazione</span>
        </Button>
      </Link>
    </nav>
  );
};