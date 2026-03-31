import React, { memo } from 'react';
import { Menu, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PageHeaderProps {
  title: string;
  description?: string;
  onMenuClick?: () => void;
  showBack?: boolean;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = memo(({ title, description, onMenuClick, showBack, actions }) => {
  const navigate = useNavigate();

  return (
    <header className="flex flex-col border-b border-m3-outline/5 bg-m3-surface sticky top-0 z-40">
      <div className="flex items-center justify-between px-4 py-3 lg:px-8">
        <div className="flex items-center gap-4">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
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
            {description && (
              <p className="text-xs lg:text-sm text-m3-on-surface-variant font-medium truncate max-w-[240px] sm:max-w-md">
                {description}
              </p>
            )}
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
