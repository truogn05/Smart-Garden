import { Outlet } from 'react-router-dom';
import { SideNav, MobileTopBar, BottomNav } from '../components/Navigation';

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <SideNav />
      <MobileTopBar />
      <main className="flex-1 md:ml-72 pb-24 md:pb-12">
        <div className="px-6 md:px-12 pt-24 md:pt-12">
          <Outlet />
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
