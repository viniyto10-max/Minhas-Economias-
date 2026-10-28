import { LayoutDashboard, ReceiptText, Plus, PieChart, BarChart3 } from 'lucide-react';
import { NavLink } from 'react-router-dom';

export default function BottomNav() {


  return (
    <nav className="bottom-nav fixed left-0 right-0 bottom-0 w-full z-40 bg-[var(--nav-bg)] border-t border-[var(--border)] px-4 py-2 flex justify-around items-center" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
      <NavLink to="/" className={({isActive}) => `p-2 cursor-pointer transition-opacity hover:opacity-80 ${isActive ? 'opacity-100' : 'opacity-60'}`} aria-label="Dashboard">
        <LayoutDashboard size={24} color={'var(--nav-icon-active)'} />
      </NavLink>
      <NavLink to="/lancamentos" className={({isActive}) => `p-2 cursor-pointer transition-opacity hover:opacity-80 ${isActive ? 'opacity-100' : 'opacity-60'}`} aria-label="Lançamentos">
        <ReceiptText size={24} color={'var(--nav-icon-active)'} />
      </NavLink>
      <NavLink to="/novo" className="bg-[var(--primary)] p-3.5 rounded-full -mt-8 text-white shadow-lg cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shrink-0" aria-label="Novo Lançamento">
        <Plus size={24} />
      </NavLink>
      <NavLink to="/categorias" className={({isActive}) => `p-2 cursor-pointer transition-opacity hover:opacity-80 ${isActive ? 'opacity-100' : 'opacity-60'}`} aria-label="Categorias">
        <PieChart size={24} color={'var(--nav-icon-active)'} />
      </NavLink>
      <NavLink to="/analises" className={({isActive}) => `p-2 cursor-pointer transition-opacity hover:opacity-80 ${isActive ? 'opacity-100' : 'opacity-60'}`} aria-label="Análises">
        <BarChart3 size={24} color={'var(--nav-icon-active)'} />
      </NavLink>
    </nav>
  );
}
