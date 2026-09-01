import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { publicNavItems as navItems } from '@/lib/publicNav';

export default function BottomNav({ unreadFanChatCount = 0, hasLiveMatches = false, fanchatEnabled = true }) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleTabClick = (e, item) => {
    const isActive = item.path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.path);

    if (isActive) {
      e.preventDefault();
      navigate(item.path, { replace: true });
    }
  };

  const items = navItems.filter(i => i.path !== '/fanchat' || fanchatEnabled);
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card border-t border-border shadow-lg"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-around h-16">
        {items.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => handleTabClick(e, item)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-all duration-200 min-w-0 relative',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn('p-1.5 rounded-lg transition-all relative', isActive && 'bg-primary/10')}>
                <Icon className={cn('w-[18px] h-[18px]', item.label === 'LIVE' && isActive && 'animate-pulse-live', item.label === 'LIVE' && hasLiveMatches && 'text-live')} />
                {/* Badge for FanChat unread messages */}
                {item.label === 'FANCHAT' && unreadFanChatCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold shadow-lg">
                    {unreadFanChatCount > 9 ? '9+' : unreadFanChatCount}
                  </div>
                )}
                {/* Live indicator for LIVE button */}
                {item.label === 'LIVE' && hasLiveMatches && !isActive && (
                  <div className="absolute -top-1.5 -right-1.5 w-2 h-2 bg-live rounded-full animate-pulse shadow-lg" />
                )}
                </div>
                <span className="text-[7.5px] font-bold tracking-wide truncate max-w-full">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}