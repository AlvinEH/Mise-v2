import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { Palette, Sun, Moon, LogOut, ChevronDown, Key, Eye, EyeOff } from 'lucide-react';
import { Theme, Mode } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

interface SettingsPageProps {
  onMenuClick: () => void;
  user: User;
  onLogout: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
}

export const SettingsPage = ({ 
  onMenuClick, 
  user, 
  onLogout,
  theme,
  setTheme,
  mode,
  setMode
}: SettingsPageProps) => {
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('Mise-gemini-api-key') || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  
  const themes: { id: Theme, label: string, color: string }[] = [
    { id: 'm3', label: 'Material 3', color: '#006d3b' },
    { id: 'catppuccin', label: 'Catppuccin', color: '#89b4fa' },
    { id: 'rose-pine', label: 'Rose Pine', color: '#ebbcba' },
    { id: 'gruvbox', label: 'Gruvbox', color: '#fabd2f' },
    { id: 'everforest', label: 'Everforest', color: '#a7c080' },
  ];

  const currentTheme = themes.find(t => t.id === theme);

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeminiApiKey(e.target.value);
    setApiKeySaved(false);
  };

  const saveApiKey = () => {
    if (geminiApiKey.trim()) {
      localStorage.setItem('Mise-gemini-api-key', geminiApiKey.trim());
    } else {
      localStorage.removeItem('Mise-gemini-api-key');
    }
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col h-[100dvh] overflow-hidden">
      <PageHeader 
        title="Settings" 
        description="Customize your experience and manage account."
        onMenuClick={onMenuClick} 
      />
      <main className="flex-1 overflow-y-auto p-8 sm:p-12 max-w-4xl mx-auto w-full min-h-0">
        <div className="space-y-12">
          {/* Theme Selection */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Palette className="text-m3-primary" size={28} />
                <h3 className="text-2xl font-black text-m3-on-surface">Appearance</h3>
              </div>
              
              {/* Mode Toggle */}
              <button
                onClick={toggleMode}
                className="p-3 bg-m3-surface-variant/20 hover:bg-m3-surface-variant/40 rounded-xl transition-all"
                title={mode === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
              >
                {mode === 'light' ? <Moon size={24} className="text-m3-on-surface" /> : <Sun size={24} className="text-m3-on-surface" />}
              </button>
            </div>

            {/* Color Palette Dropdown */}
            <div className="space-y-4">
              <label className="text-sm font-black uppercase tracking-widest text-m3-on-surface-variant">Color Palette</label>
              <div className="relative">
                <button
                  onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                  className="w-full flex items-center justify-between p-4 bg-m3-surface-variant/10 hover:bg-m3-surface-variant/20 border border-m3-outline/10 rounded-[24px] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: currentTheme?.color }} />
                    <span className="font-black text-m3-on-surface">{currentTheme?.label}</span>
                  </div>
                  <ChevronDown size={20} className={`text-m3-on-surface-variant transition-transform ${isThemeDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isThemeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-xl z-10 overflow-hidden">
                    {themes.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          setTheme(t.id);
                          setIsThemeDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-4 p-4 hover:bg-m3-surface-variant/20 transition-all ${
                          theme === t.id ? 'bg-m3-primary/5' : ''
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: t.color }} />
                        <span className="font-black text-m3-on-surface">{t.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.section>

          {/* API Configuration */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3">
              <Key className="text-m3-primary" size={28} />
              <h3 className="text-2xl font-black text-m3-on-surface">API Configuration</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase tracking-widest text-m3-on-surface-variant">Gemini API Key</label>
                <p className="text-sm text-m3-on-surface-variant font-medium">
                  Enter your Google AI Studio API key to enable recipe URL extraction.
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-m3-primary hover:underline ml-1">
                    Get your free API key here →
                  </a>
                </p>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={handleApiKeyChange}
                    className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/10 rounded-[20px] outline-none focus:border-m3-primary font-mono text-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-m3-on-surface-variant/60 hover:text-m3-on-surface-variant transition-colors"
                  >
                    {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  onClick={saveApiKey}
                  className={`px-6 py-3 rounded-[20px] font-bold transition-all ${
                    apiKeySaved 
                      ? 'bg-green-500 text-white' 
                      : 'bg-m3-primary text-m3-on-primary hover:bg-m3-primary/90'
                  }`}
                >
                  {apiKeySaved ? 'Saved!' : 'Save'}
                </button>
              </div>
              
              {geminiApiKey && (
                <div className="p-4 bg-m3-primary/10 rounded-[20px] border border-m3-primary/20">
                  <p className="text-sm text-m3-primary font-bold">
                    ✓ API key configured. You can now extract recipes from URLs!
                  </p>
                </div>
              )}
            </div>
          </motion.section>

          {/* Account Information */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="bg-m3-surface-variant/10 rounded-[32px] p-8 border border-m3-outline/10"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-m3-on-surface">Account Information</h3>
              <button
                onClick={onLogout}
                className="p-3 text-m3-on-surface-variant hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                title="Log Out"
              >
                <LogOut size={24} />
              </button>
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-2xl font-black text-m3-on-surface truncate">{user.displayName}</span>
              <span className="text-m3-on-surface-variant font-bold truncate">{user.email}</span>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};