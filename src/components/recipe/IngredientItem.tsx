import React, { useState, useEffect } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { GripVertical, Trash2, RefreshCw } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { IngredientItemProps } from '../../types';
import { COMMON_UNITS, UNIT_CONVERSIONS } from '../../constants';
import { parseShoppingItem } from '../../utils/shoppingItems';

export const IngredientItem = ({ ing, index, onUpdate, onRemove, onConvert }: IngredientItemProps) => {
  const dragControls = useDragControls();
  
  // Initialize smart input with existing ingredient data on first render
  const [smartInput, setSmartInput] = useState(() => {
    return [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ');
  });
  const [useSmartInput, setUseSmartInput] = useState(true);
  
  // Keep smart input in sync with external updates (like AI extraction)
  useEffect(() => {
    const fullText = [ing.amount, ing.unit, ing.name].filter(Boolean).join(' ');
    // Only update if the text is different to avoid cursor jumping
    if (fullText !== smartInput) {
      setSmartInput(fullText);
    }
  }, [ing.amount, ing.unit, ing.name]);

  // Handle smart input change (just update local state, no parsing)
  const handleSmartInputChange = (value: string) => {
    setSmartInput(value);
  };

  // Handle smart input parsing ONLY on blur or Enter key
  const handleSmartInputParse = () => {
    const value = smartInput.trim();
    if (value) {
      const parsed = parseShoppingItem(value);
      console.log('Calling onUpdate with batch parsed values:', parsed);
      // Use batch update to set all fields at once
      onUpdate(index, {
        amount: parsed.amount,
        unit: parsed.unit,
        name: parsed.name
      });
    } else {
      // Clear all fields if input is empty using batch update
      onUpdate(index, {
        amount: '',
        unit: '',
        name: ''
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
    <Reorder.Item 
      value={ing}
      dragListener={false}
      dragControls={dragControls}
      className="relative flex gap-2 items-center bg-m3-surface-variant/30 p-3 rounded-2xl group"
    >
      {/* Drag Handle */}
      <div 
        className="cursor-grab active:cursor-grabbing touch-none flex items-center justify-center text-m3-on-surface-variant/20 group-hover:text-m3-on-surface-variant/60 transition-colors"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <GripVertical size={20} />
      </div>

      <div className="flex-1 flex flex-col gap-3">
        {useSmartInput ? (
          <div className="space-y-3">
            <div className="relative">
              <TextareaAutosize 
                value={smartInput}
                onChange={e => handleSmartInputChange(e.target.value)}
                onBlur={handleSmartInputParse}
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
                    Amt: {ing.amount || 'empty'}
                  </span>
                  <span className="bg-m3-secondary-container/30 px-2 py-1 rounded-full">
                    Unit: {ing.unit || 'empty'}
                  </span>
                  <span className="bg-m3-tertiary-container/30 px-2 py-1 rounded-full max-w-[120px] truncate">
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
      </div>

      <div className="flex flex-col gap-2 relative z-20">
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
          className="p-2 text-m3-primary/60 hover:text-m3-primary hover:bg-m3-primary/10 transition-colors rounded-lg"
          title={useSmartInput ? "Switch to separate fields" : "Switch to smart input"}
        >
          <RefreshCw size={16} />
        </button>
        
        <button 
          type="button"
          onClick={() => onRemove(ing.id)}
          className="p-2 text-m3-on-surface-variant/40 hover:text-red-600 transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </Reorder.Item>
  );
};