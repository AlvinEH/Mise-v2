import React, { memo } from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  onMenuClick?: () => void;
  showBack?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = memo(({ title, onMenuClick, showBack, onBack, actions }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className="flex flex-col border-b border-m3-outline/5 bg-m3-surface sticky top-0 z-40 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8 lg:py-4">
        <div className="flex items-center gap-4">
          {showBack ? (
            <button
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-m3-surface-variant/30 text-m3-on-surface transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </button>
          ) : onMenuClick ? (
            <button
              onClick={onMenuClick}
              className="p-2 -ml-2 rounded-full hover:bg-m3-surface-variant/30 text-m3-on-surface transition-colors lg:hidden"
              aria-label="Open menu"
            >
              <Menu size={24} />
            </button>
          ) : null}
          <div>
            <h1 className="text-xl lg:text-2xl font-black tracking-tight text-m3-on-surface truncate">
              {title}
            </h1>
          </div>
        </div>
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
});
