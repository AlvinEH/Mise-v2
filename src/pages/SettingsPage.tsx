import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { motion } from 'motion/react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { Palette, Sun, Moon, LogOut, ChevronDown, Key, Eye, EyeOff, CheckSquare, Circle, User as UserIcon, Sparkles, Monitor } from 'lucide-react';
import { Theme, Mode, CheckboxStyle } from '../types';
import { PageHeader } from '../components/layout/PageHeader';

interface SettingsPageProps {
  user: User;
  onLogout: () => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  mode: Mode;
  setMode: (m: Mode) => void;
  checkboxStyle: CheckboxStyle;
  setCheckboxStyle: (s: CheckboxStyle) => void;
  aiAutoSort: boolean;
  setAiAutoSort: (v: boolean) => void;
}

export const SettingsPage = ({ 
  user, 
  onLogout,
  theme,
  setTheme,
  mode,
  setMode,
  checkboxStyle,
  setCheckboxStyle,
  aiAutoSort,
  setAiAutoSort
}: SettingsPageProps) => {
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isCheckboxDropdownOpen, setIsCheckboxDropdownOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [isLoadingKey, setIsLoadingKey] = useState(true);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const docRef = doc(db, 'users', user.uid, 'settings', 'gemini');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGeminiApiKey(docSnap.data().apiKey || '');
          // Keep localStorage as a fallback for offline/legacy support if needed, 
          // but we prioritize cloud now.
          if (docSnap.data().apiKey) {
            localStorage.setItem('Mise-gemini-api-key', docSnap.data().apiKey);
          }
        }
      } catch (error) {
        console.error('Error fetching API key:', error);
      } finally {
        setIsLoadingKey(false);
      }
    };
    fetchApiKey();
  }, [user.uid]);
  
  const themes: { id: Theme, label: string, color: string }[] = [
    { id: 'catppuccin', label: 'Catppuccin', color: '#89b4fa' },
    { id: 'dracula', label: 'Dracula', color: '#bd93f9' },
    { id: 'everforest', label: 'Everforest', color: '#a7c080' },
    { id: 'gruvbox', label: 'Gruvbox', color: '#fabd2f' },
    { id: 'm3', label: 'Material 3', color: '#006d3b' },
    { id: 'nord', label: 'Nord', color: '#88c0d0' },
    { id: 'rose-pine', label: 'Rose Pine', color: '#ebbcba' },
    { id: 'sakura', label: 'Sakura', color: '#ffb7c5' },
    { id: 'solarized', label: 'Solarized', color: '#b58900' },
  ];

  const currentTheme = themes.find(t => t.id === theme);

  const toggleMode = () => {
    if (mode === 'light') setMode('dark');
    else if (mode === 'dark') setMode('auto');
    else setMode('light');
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGeminiApiKey(e.target.value);
    setApiKeySaved(false);
  };

  const saveApiKey = async () => {
    try {
      const docRef = doc(db, 'users', user.uid, 'settings', 'gemini');
      if (geminiApiKey.trim()) {
        await setDoc(docRef, {
          apiKey: geminiApiKey.trim(),
          updatedAt: serverTimestamp()
        });
        localStorage.setItem('Mise-gemini-api-key', geminiApiKey.trim());
      } else {
        await setDoc(docRef, {
          apiKey: '',
          updatedAt: serverTimestamp()
        });
        localStorage.removeItem('Mise-gemini-api-key');
      }
      setApiKeySaved(true);
      setTimeout(() => setApiKeySaved(false), 2000);
    } catch (error) {
      console.error('Error saving API key:', error);
      alert('Failed to save API key to your account.');
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <PageHeader 
        title="Settings" 
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
                title={mode === 'light' ? 'Switch to Dark Mode' : mode === 'dark' ? 'Switch to Auto Mode' : 'Switch to Light Mode'}
              >
                {mode === 'light' ? <Sun size={24} className="text-m3-on-surface" /> : 
                 mode === 'dark' ? <Moon size={24} className="text-m3-on-surface" /> : 
                 <Monitor size={24} className="text-m3-on-surface" />}
              </button>
            </div>

            {/* Color Palette Dropdown */}
            <div className="space-y-6">
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

              {/* Checkbox Style Dropdown */}
              <div className="space-y-4">
                <label className="text-sm font-black uppercase tracking-widest text-m3-on-surface-variant">Checkbox Style</label>
                <div className="relative">
                  <button
                    onClick={() => setIsCheckboxDropdownOpen(!isCheckboxDropdownOpen)}
                    className="w-full flex items-center justify-between p-4 bg-m3-surface-variant/10 hover:bg-m3-surface-variant/20 border border-m3-outline/10 rounded-[24px] transition-all"
                  >
                    <div className="flex items-center gap-4 text-m3-on-surface">
                      {checkboxStyle === 'square' ? <CheckSquare size={24} /> : <Circle size={24} />}
                      <span className="font-black capitalize">{checkboxStyle}</span>
                    </div>
                    <ChevronDown size={20} className={`text-m3-on-surface-variant transition-transform ${isCheckboxDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isCheckboxDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-m3-surface border border-m3-outline/10 rounded-[24px] shadow-xl z-10 overflow-hidden">
                      <button
                        onClick={() => {
                          setCheckboxStyle('square');
                          setIsCheckboxDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-4 p-4 hover:bg-m3-surface-variant/20 transition-all ${
                          checkboxStyle === 'square' ? 'bg-m3-primary/5' : ''
                        }`}
                      >
                        <CheckSquare size={24} className="text-m3-on-surface" />
                        <span className="font-black text-m3-on-surface">Square</span>
                      </button>
                      <button
                        onClick={() => {
                          setCheckboxStyle('circle');
                          setIsCheckboxDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-4 p-4 hover:bg-m3-surface-variant/20 transition-all ${
                          checkboxStyle === 'circle' ? 'bg-m3-primary/5' : ''
                        }`}
                      >
                        <Circle size={24} className="text-m3-on-surface" />
                        <span className="font-black text-m3-on-surface">Circle</span>
                      </button>
                    </div>
                  )}
                </div>
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
                    className="w-full pl-4 pr-12 py-3 bg-m3-surface-variant/20 border border-m3-outline/10 rounded-[20px] outline-none focus:border-m3-primary font-mono text-sm transition-all"
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
                  className={`px-8 py-2.5 rounded-full font-semibold text-sm transition-all active:scale-95 ${
                    apiKeySaved 
                      ? 'bg-green-500 text-white' 
                      : 'bg-m3-primary text-m3-on-primary shadow-sm hover:shadow-md'
                  }`}
                >
                  {apiKeySaved ? 'Saved!' : 'Save'}
                </button>
              </div>
              
              {geminiApiKey && (
                <div className="space-y-4 pt-4 border-t border-m3-outline/10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Sparkles size={16} className="text-m3-primary" />
                        <span className="text-sm font-black text-m3-on-surface">AI Auto-Sort Items</span>
                      </div>
                      <p className="text-xs text-m3-on-surface-variant font-medium">
                        Automatically sort purchased items using AI.
                      </p>
                    </div>
                    <button
                      onClick={() => setAiAutoSort(!aiAutoSort)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-m3-primary focus:ring-offset-2 ${
                        aiAutoSort ? 'bg-m3-primary' : 'bg-m3-surface-variant/40'
                      }`}
                    >
                      <span
                        className={`pointer-events-none h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          aiAutoSort ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="p-4 bg-m3-primary/10 rounded-[20px] border border-m3-primary/20">
                    <p className="text-sm text-m3-primary font-bold">
                      ✓ API key configured. You can now extract recipes and enable AI auto-sort!
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.section>

          {/* Account Information */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserIcon className="text-m3-primary" size={28} />
                <h3 className="text-2xl font-black text-m3-on-surface">Account</h3>
              </div>
              <button
                onClick={onLogout}
                className="p-3 bg-m3-surface-variant/20 hover:bg-m3-surface-variant/40 rounded-xl transition-all text-m3-on-surface"
                title="Log Out"
              >
                <LogOut size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-sm font-black uppercase tracking-widest text-m3-on-surface-variant">Profile</label>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-2xl font-black text-m3-on-surface truncate">{user.displayName}</span>
                  <span className="text-m3-on-surface-variant font-bold truncate">{user.email}</span>
                </div>
              </div>
            </div>
          </motion.section>
        </div>
      </main>
    </div>
  );
};