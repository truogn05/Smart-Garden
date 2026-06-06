import { Link, useLocation } from 'react-router-dom';
import { Leaf, LayoutDashboard, Droplets, Thermometer, Cpu, Settings, HelpCircle, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/devices', icon: Cpu, label: 'Devices' },
  { path: '/watering', icon: Droplets, label: 'Watering' },
  { path: '/soil-weather', icon: Thermometer, label: 'Environment' },
  { path: '/insights', icon: Leaf, label: 'Insights' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function NavLink({ path, icon: Icon, label, isActive }: { path: string; icon: React.ElementType; label: string; isActive: boolean }) {
  return (
    <Link
      to={path}
      className={`flex items-center gap-4 px-4 py-3 rounded-lg transition-all duration-200 ${
        isActive
          ? 'bg-primary text-on-primary font-bold scale-[0.97] shadow-sm'
          : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-high'
      }`}
    >
      <Icon size={20} />
      <span className="font-label-md">{label}</span>
    </Link>
  );
}

export function SideNav() {
  const location = useLocation();
  const active = location.pathname;

  return (
    <nav className="hidden md:flex flex-col h-screen w-72 fixed left-0 top-0 bg-surface-container-low/80 backdrop-blur-2xl shadow-[30px_0_60px_rgba(23,49,36,0.03)] z-40 p-unit gap-4">
      {/* Brand */}
      <div className="px-6 py-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center">
            <Leaf className="text-on-primary-container" size={20} />
          </div>
          <h1 className="font-headline-md text-headline-md text-primary">Garden Zen</h1>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="w-2 h-2 rounded-full bg-tertiary-fixed-dim"></span>
          <span className="font-label-md text-label-md text-tertiary-container">System Online</span>
        </div>
      </div>

      {/* Nav Links */}
      <div className="flex flex-col gap-1 px-4 flex-1">
        {navItems.map(item => (
          <NavLink key={item.path} {...item} isActive={active === item.path || (active === '/' && item.path === '/dashboard')} />
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 mt-auto border-t border-surface-variant/30">
        <Link to="/help" className="flex items-center gap-4 px-4 py-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-colors">
          <HelpCircle size={20} />
          <span className="font-body-md">Help</span>
        </Link>
        <button
          onClick={() => { document.cookie = 'jwt=; Max-Age=0; path=/'; window.location.href = '/login'; }}
          className="w-full flex items-center gap-4 px-4 py-2 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-colors"
        >
          <LogOut size={20} />
          <span className="font-body-md">Logout</span>
        </button>
      </div>
    </nav>
  );
}

export function MobileTopBar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const currentLabel = navItems.find(i => location.pathname === i.path)?.label || 'Home';

  return (
    <header className="md:hidden flex justify-between items-center w-full px-container-padding-mobile py-4 sticky top-0 z-50 bg-surface/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(23,49,36,0.05)] border-b border-surface-variant/30">
      <button onClick={() => setMenuOpen(!menuOpen)} className="text-primary">
        <Menu size={24} />
      </button>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">{currentLabel}</h1>
      <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant">
        <img
          alt="Profile"
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuDftM1zjwu05qpl8OzBLOyzo4Nh_7CAMpKUk5IWOZ4gyTW17WJGXCn6TXQMXEpuu68z1BXRQCRYpxLIFbRXaW3komrsiB7GGcZOrD8C1HL5fnyDbBYgZ7S0sgU0h4cPrfC4lXuoK-4wIWVx_akb2XoK6-9sd5-w7qzZJu9Q3rGLWAmMCPFTEqqLNzfGnj6igDSainELMD57xpcomTpwbM8q2ZnL5ShSLrGfqFM6k1vBbDLGL_ePjkodOC3Bkicze6ijEkFIMxAglwGX"
        />
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="fixed inset-0 top-16 z-50 bg-surface/95 backdrop-blur-xl">
          <div className="flex flex-col gap-2 p-6">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-4 px-4 py-4 rounded-lg transition-all ${
                  location.pathname === item.path
                    ? 'bg-primary-container text-on-primary-container font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <item.icon size={20} />
                <span className="font-body-lg">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-safe h-20 bg-surface/60 backdrop-blur-2xl border-t border-outline-variant/20 shadow-[0_-10px_40px_rgba(23,49,36,0.08)]">
      {navItems.slice(0, 5).map(item => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center justify-center p-2 transition-transform ${
              isActive ? 'text-primary' : 'text-on-surface-variant'
            }`}
          >
            <item.icon size={22} />
            <span className="text-[10px] mt-1 font-label-md">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
