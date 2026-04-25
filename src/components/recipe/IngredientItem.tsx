import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trash2, RefreshCw, ChevronUp, ChevronDown, StickyNote, CheckSquare } from 'lucide-react';
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
  
  const [isFocused, setIsFocused] = useState(false);
  
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

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 50,
        mass: 1
      }}
      className="relative flex gap-2 items-center bg-m3-surface-variant/30 p-3 rounded-2xl group"
    >
      <div className="flex-1 flex flex-col gap-3">
        {useSmartInput ? (
          <div className="space-y-3">
            <div className="relative">
              <TextareaAutosize 
                value={smartInput}
                onChange={e => handleSmartInputChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                  setIsFocused(false);
                  handleSmartInputParse();
                }}
                onKeyDown={handleKeyDown}
                className="w-full px-4 py-3 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-all resize-none text-sm font-medium"
                placeholder="2 cups all-purpose flour"
                minRows={1}
              />
              <span className="absolute -top-2 left-3 px-1 bg-m3-surface text-[10px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider">
                Smart Input
              </span>
            </div>
            
            {(ing.amount || ing.unit || ing.name) && (
              <div className="flex flex-col gap-2">
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
                  {ing.isOptional && (
                    <span className="bg-m3-outline-variant/30 px-2 py-1 rounded-full font-bold uppercase tracking-tighter">
                      Optional
                    </span>
                  )}
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
                          onClick={() => onConvert(index, targetUnit)}
                          className="text-[10px] bg-m3-primary/10 text-m3-primary px-2 py-0.5 rounded-full hover:bg-m3-primary/20 transition-all active:scale-95 font-medium"
                        >
                          to {targetUnit}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <TextareaAutosize 
              value={ing.name}
              onChange={e => onUpdate(index, 'name', e.target.value)}
              className="w-full px-4 py-2.5 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-all resize-none text-sm font-medium"
              placeholder="Ingredient name (e.g. All-purpose flour)"
              minRows={1}
            />
            
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <input 
                  type="text" 
                  value={ing.amount}
                  onChange={e => onUpdate(index, 'amount', e.target.value)}
                  className="w-full px-3 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-all text-center text-sm"
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
                  className="w-full px-3 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-all appearance-none cursor-pointer text-sm"
                >
                  {COMMON_UNITS.map(u => (
                    <option key={u} value={u}>{u || 'Unit'}</option>
                  ))}
                </select>
                <span className="absolute -top-2 left-3 px-1 bg-m3-surface text-[10px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider">Unit</span>
              </div>
            </div>
          </div>
        )}

        {showNote && (
          <div className="relative mt-1">
            <TextareaAutosize 
              value={ing.note || ''}
              onChange={e => onUpdate(index, 'note', e.target.value)}
              className="w-full px-4 py-2 bg-m3-surface border border-m3-outline/20 rounded-xl outline-none focus:border-m3-primary transition-all resize-none text-[12px] font-medium italic text-m3-on-surface-variant"
              placeholder="Add a note (e.g. sifted, melted)..."
              minRows={1}
            />
            <span className="absolute -top-2 left-3 px-1 bg-m3-surface text-[9px] text-m3-on-surface-variant/60 font-bold uppercase tracking-wider">
              Note
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1 items-center">
        {onMoveUp && (
          <button 
            type="button"
            onClick={() => onMoveUp(index)}
            disabled={isFirst}
            className={`p-1.5 rounded-lg transition-all ${isFirst ? 'text-m3-on-surface-variant/10 cursor-not-allowed' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
          >
            <ChevronUp size={18} />
          </button>
        )}

        <div className="flex flex-col gap-1.5">
          <button 
            type="button"
            onClick={() => {
              const newMode = !useSmartInput;
              if (newMode) {
                // Switching to smart mode - reconstruct input from fields
                const fullText = [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ');
                setSmartInput(fullText);
              }
              setUseSmartInput(newMode);
            }}
            className="p-1.5 text-m3-primary/60 hover:text-m3-primary hover:bg-m3-primary/10 transition-colors rounded-lg"
            title={useSmartInput ? "Switch to separate fields" : "Switch to smart input"}
          >
            <RefreshCw size={14} />
          </button>

          <button 
            type="button"
            onClick={() => setShowNote(!showNote)}
            className={`p-1.5 transition-colors rounded-lg ${showNote ? 'text-m3-primary bg-m3-primary/10' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
            title="Toggle note"
          >
            <StickyNote size={14} />
          </button>
          
          <button 
            type="button"
            onClick={() => onUpdate(index, 'isOptional', !ing.isOptional)}
            className={`p-1.5 transition-colors rounded-lg ${ing.isOptional ? 'text-m3-primary bg-m3-primary/10' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
            title="Mark as optional"
          >
            <CheckSquare size={14} />
          </button>
          
          <button 
            type="button"
            onClick={() => onRemove(ing.id)}
            className="p-1.5 text-m3-on-surface-variant/40 hover:text-red-600 transition-colors rounded-lg"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {onMoveDown && (
          <button 
            type="button"
            onClick={() => onMoveDown(index)}
            disabled={isLast}
            className={`p-1.5 rounded-lg transition-all ${isLast ? 'text-m3-on-surface-variant/10 cursor-not-allowed' : 'text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10'}`}
          >
            <ChevronDown size={18} />
          </button>
        )}
      </div>
    </motion.div>
  );
};