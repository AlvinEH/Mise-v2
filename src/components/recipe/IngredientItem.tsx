import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trash2, RefreshCw, ChevronUp, ChevronDown, StickyNote, CheckSquare, Info } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { IngredientItemProps } from '../../types';
import { COMMON_UNITS, UNIT_CONVERSIONS } from '../../constants';
import { parseShoppingItem, formatAmount } from '../../utils/shoppingItems';

export const IngredientItem = ({ 
  ing, 
  index, 
  onUpdate, 
  onRemove, 
  onConvert,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast 
}: IngredientItemProps) => {
  // Initialize smart input with existing ingredient data on first render
  const [smartInput, setSmartInput] = useState(() => {
    return [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ');
  });
  const [useSmartInput, setUseSmartInput] = useState(true);
  const [showNote, setShowNote] = useState(!!ing.note);
  const [showDetails, setShowDetails] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset details when card is collapsed
  useEffect(() => {
    if (!isActive) {
      setShowDetails(false);
    }
  }, [isActive]);

  // Handle clicking outside to deactivate
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        setIsActive(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Keep smart input in sync with external updates (like AI extraction)
  useEffect(() => {
    // If the user is actively typing, don't override their input to prevent cursor jumps
    if (isFocused) return;

    const displayAmt = formatAmount(ing.amount);
    const fullText = [displayAmt, ing.unit, ing.name].filter(Boolean).join(' ');
    // Only update if the text is different to avoid cursor jumping
    if (fullText !== smartInput) {
      setSmartInput(fullText);
    }
  }, [ing.amount, ing.unit, ing.name, isFocused]);

  // Handle smart input change (update parent state on every change)
  const handleSmartInputChange = (value: string) => {
    setSmartInput(value);
    const parsed = parseShoppingItem(value);
    onUpdate(index, {
      amount: parsed.amount,
      unit: parsed.unit,
      name: parsed.name
    });
  };

  // Handle smart input parsing on blur (redundant but safe)
  const handleSmartInputParse = () => {
    const value = smartInput.trim();
    if (value) {
      const parsed = parseShoppingItem(value);
      onUpdate(index, {
        amount: parsed.amount,
        unit: parsed.unit,
        name: parsed.name
      });
    }
  };

  // Handle key down for Enter key parsing
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSmartInputParse();
    }
  };

  const hasExtraContent = showNote || !useSmartInput || (useSmartInput && showDetails);

  return (
    <motion.div 
      ref={cardRef}
      layout
      onClick={() => setIsActive(!isActive)}
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0
      }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ 
        layout: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
        opacity: { duration: 0.2 },
        y: { type: "spring", stiffness: 200, damping: 25, mass: 1 }
      }}
      className={`relative flex flex-col p-4 bg-m3-surface-variant/30 rounded-2xl cursor-pointer ${isActive ? 'ring-2 ring-m3-primary/30 shadow-lg' : 'hover:bg-m3-surface-variant/50'}`}
    >
      <div className="flex flex-col overflow-hidden">
        <AnimatePresence initial={false}>
          {ing.isOptional && (
            <motion.div
              initial={{ height: 0, opacity: 0, scale: 0.8, marginBottom: 0 }}
              animate={{ 
                height: 'auto', 
                opacity: 1, 
                scale: 1,
                marginBottom: 6 
              }}
              exit={{ height: 0, opacity: 0, scale: 0.8, marginBottom: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="flex overflow-hidden"
            >
              <span className="bg-m3-outline-variant/30 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter text-m3-on-surface-variant">
                Optional
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false} custom={useSmartInput}>
          {useSmartInput ? (
            <motion.div 
              key="smart"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col"
            >
              <div className="flex gap-3 items-center">
                <div className="flex-1 relative">
                  <TextareaAutosize 
                    value={smartInput}
                    onChange={e => handleSmartInputChange(e.target.value)}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setIsFocused(true);
                      setIsActive(true);
                    }}
                    onBlur={() => {
                      setIsFocused(false);
                      handleSmartInputParse();
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-colors resize-none text-sm font-medium"
                    placeholder="2 cups all-purpose flour"
                    minRows={1}
                  />
                  <span className="absolute -top-2 left-3 px-1 bg-m3-surface text-[10px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider">
                    Smart Input
                  </span>
                </div>
                
                <div className="flex flex-col gap-1 items-center shrink-0">
                  {onMoveUp && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp(index);
                      }}
                      disabled={isFirst}
                      className={`p-1.5 rounded-lg transition-colors ${isFirst ? 'text-m3-on-surface-variant/10 cursor-not-allowed' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                    >
                      <ChevronUp size={18} />
                    </button>
                  )}

                  {onMoveDown && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown(index);
                      }}
                      disabled={isLast}
                      className={`p-1.5 rounded-lg transition-colors ${isLast ? 'text-m3-on-surface-variant/10 cursor-not-allowed' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                    >
                      <ChevronDown size={18} />
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showNote && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ 
                      height: 'auto', 
                      opacity: 1,
                      marginTop: 6
                    }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="relative overflow-hidden"
                  >
                    <div className="relative pt-2 pr-[42px]">
                      <TextareaAutosize 
                        value={ing.note || ''}
                        onChange={e => onUpdate(index, 'note', e.target.value)}
                        onFocus={(e) => {
                          e.stopPropagation();
                          setIsActive(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-4 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-colors resize-none text-[12px] font-medium italic text-m3-on-surface-variant"
                        placeholder="Add a note (e.g. sifted, melted)..."
                        minRows={1}
                      />
                      <span className="absolute top-0 left-3 px-1 bg-m3-surface text-[9px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider z-10">
                        Note
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <AnimatePresence initial={false}>
                {(showDetails && (ing.amount || ing.unit || ing.name)) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ 
                      height: 'auto', 
                      opacity: 1,
                      marginTop: 6
                    }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex flex-col gap-2 overflow-hidden pr-[42px]"
                  >
                    <div className="flex flex-wrap gap-1 text-[10px] text-m3-on-surface-variant">
                      <span className="bg-m3-primary-container/30 px-2 py-1 rounded-full">
                        Amt: {formatAmount(ing.amount) || 'empty'}
                      </span>
                      <span className="bg-m3-secondary-container/30 px-2 py-1 rounded-full">
                        Unit: {ing.unit || 'empty'}
                      </span>
                      <span className="bg-m3-tertiary-container/30 px-2 py-1 rounded-full break-words">
                        Name: {ing.name || 'empty'}
                      </span>
                    </div>

                    {ing.unit && ing.amount && (() => {
                      const baseUnit = ing.unit.replace(/\s+(can|bottle)s?$/i, '').toLowerCase();
                      const conversions = UNIT_CONVERSIONS[baseUnit];
                      if (!conversions) return null;

                      return (
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-m3-on-surface-variant/40">Convert:</span>
                          {Object.keys(conversions).map(targetUnit => (
                            <button
                              key={targetUnit}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onConvert(index, targetUnit);
                              }}
                              className="text-[10px] bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded-full hover:bg-m3-primary/20 transition-colors active:scale-95 font-medium"
                            >
                              to {targetUnit}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              key="manual"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col"
            >
              <div className="flex gap-3 items-center">
                <TextareaAutosize 
                  value={ing.name}
                  onChange={e => onUpdate(index, 'name', e.target.value)}
                  onFocus={(e) => {
                    e.stopPropagation();
                    setIsActive(true);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="flex-1 px-4 py-2.5 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-colors resize-none text-sm font-medium"
                  placeholder="Ingredient name (e.g. All-purpose flour)"
                  minRows={1}
                />
                
                <div className="flex flex-col gap-1 items-center shrink-0">
                  {onMoveUp && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveUp(index);
                      }}
                      disabled={isFirst}
                      className={`p-1.5 rounded-lg transition-colors ${isFirst ? 'text-m3-on-surface-variant/10 cursor-not-allowed' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                    >
                      <ChevronUp size={18} />
                    </button>
                  )}

                  {onMoveDown && (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveDown(index);
                      }}
                      disabled={isLast}
                      className={`p-1.5 rounded-lg transition-colors ${isLast ? 'text-m3-on-surface-variant/10 cursor-not-allowed' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                    >
                      <ChevronDown size={18} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 pr-[42px] mt-[6px]">
                <div className="relative">
                  <input 
                    type="text" 
                    value={ing.amount}
                    onChange={e => onUpdate(index, 'amount', e.target.value)}
                    onFocus={(e) => {
                      e.stopPropagation();
                      setIsActive(true);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full px-3 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-colors text-center text-sm"
                    placeholder="Qty"
                  />
                  <span className="absolute -top-2 left-3 px-1 bg-m3-surface text-[10px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider">Amt</span>
                </div>
                
                <div className="relative">
                  <select 
                    value={ing.unit}
                    onChange={e => {
                      const newUnit = e.target.value;
                      if (ing.unit && newUnit && UNIT_CONVERSIONS[ing.unit]?.[newUnit]) {
                        onConvert(index, newUnit);
                      } else {
                        onUpdate(index, 'unit', newUnit);
                      }
                    }}
                    onFocus={() => setIsActive(true)}
                    className="w-full px-3 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-colors appearance-none cursor-pointer text-sm"
                  >
                    {COMMON_UNITS.map(u => (
                      <option key={u} value={u}>{u || 'Unit'}</option>
                    ))}
                  </select>
                  <span className="absolute -top-2 left-3 px-1 bg-m3-surface text-[10px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider">Unit</span>
                </div>
              </div>

              <AnimatePresence initial={false}>
                {showNote && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ 
                      height: 'auto', 
                      opacity: 1,
                      marginTop: 6
                    }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="relative overflow-hidden"
                  >
                    <div className="relative pt-2 pr-[42px]">
                      <TextareaAutosize 
                        value={ing.note || ''}
                        onChange={e => onUpdate(index, 'note', e.target.value)}
                        onFocus={(e) => {
                          e.stopPropagation();
                          setIsActive(true);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-4 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-colors resize-none text-[12px] font-medium italic text-m3-on-surface-variant"
                        placeholder="Add a note (e.g. sifted, melted)..."
                        minRows={1}
                      />
                      <span className="absolute top-0 left-3 px-1 bg-m3-surface text-[9px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider z-10">
                        Note
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence initial={false}>
        {isActive && (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ 
              height: 'auto', 
              opacity: 1,
              marginTop: hasExtraContent ? 16 : 4
            }}
            exit={{ height: 0, opacity: 0, marginTop: 0 }}
            transition={{ 
              height: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
              opacity: { duration: 0.2, ease: "easeInOut" },
              marginTop: { duration: 0.3 }
            }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 pt-3 border-t border-m3-outline/10">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  const newMode = !useSmartInput;
                  if (newMode) {
                    const displayAmt = formatAmount(ing.amount);
                    const fullText = [displayAmt, ing.unit, ing.name].filter(Boolean).join(' ');
                    setSmartInput(fullText);
                  }
                  setUseSmartInput(newMode);
                }}
                className={`p-2 transition-colors rounded-xl ${!useSmartInput ? 'text-m3-primary bg-m3-primary/10 ring-1 ring-m3-primary/20' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                title={useSmartInput ? "Switch to manual fields" : "Switch to smart input"}
              >
                <RefreshCw size={16} />
              </button>

              {useSmartInput && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDetails(!showDetails);
                  }}
                  className={`p-2 transition-colors rounded-xl ${showDetails ? 'text-m3-primary bg-m3-primary/10 ring-1 ring-m3-primary/20' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                  title="Toggle details"
                >
                  <Info size={16} />
                </button>
              )}

              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNote(!showNote);
                }}
                className={`p-2 transition-colors rounded-xl ${showNote ? 'text-m3-primary bg-m3-primary/10 ring-1 ring-m3-primary/20' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                title="Toggle note"
              >
                <StickyNote size={16} />
              </button>
              
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate(index, 'isOptional', !ing.isOptional);
                }}
                className={`p-2 transition-colors rounded-xl ${ing.isOptional ? 'text-m3-primary bg-m3-primary/10 ring-1 ring-m3-primary/20' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
                title="Toggle optional status"
              >
                <CheckSquare size={16} />
              </button>
              
              <div className="flex-1" />

              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(ing.id);
                }}
                className="p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 transition-colors rounded-xl"
                title="Remove ingredient"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};