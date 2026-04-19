import React from 'react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { X, Edit2, Minimize2, Trash2, Plus, ShoppingCart } from 'lucide-react';
import { InventoryItem, CheckboxStyle } from '../../types';
import { InventoryListItem } from './InventoryListItem';

interface LocationExpandedViewProps {
  location: string | null;
  onClose: () => void;
  isEditMode: boolean;
  setIsEditMode: (val: boolean) => void;
  isEditingLocationName: boolean;
  setIsEditingLocationName: (val: boolean) => void;
  editLocationNameValue: string;
  setEditLocationNameValue: (val: string) => void;
  handleUpdateLocationName: () => void;
  handleStartEditLocationName: (loc: string) => void;
  setLocationToDelete: (loc: string) => void;
  setLocationToMove: (loc: string) => void;
  filteredItems: InventoryItem[];
  toggleItemUsed: (item: InventoryItem) => void;
  startEdit: (item: InventoryItem) => void;
  handleDelete: (item: InventoryItem) => void;
  handleClearUsed: (loc: string) => void;
  handleRestockUsed: (loc: string) => void;
  handleReorderItems: (loc: string, items: InventoryItem[]) => void;
  syncReorderedItems: (loc: string) => void;
  startAddWithLocation: (loc: string) => void;
  checkboxStyle: CheckboxStyle;
}

export const LocationExpandedView: React.FC<LocationExpandedViewProps> = ({
  location,
  onClose,
  isEditMode,
  setIsEditMode,
  isEditingLocationName,
  setIsEditingLocationName,
  editLocationNameValue,
  setEditLocationNameValue,
  handleUpdateLocationName,
  handleStartEditLocationName,
  setLocationToDelete,
  setLocationToMove,
  filteredItems,
  toggleItemUsed,
  startEdit,
  handleDelete,
  handleClearUsed,
  handleRestockUsed,
  handleReorderItems,
  syncReorderedItems,
  startAddWithLocation,
  checkboxStyle
}) => {
  return (
    <AnimatePresence>
      {location && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="fixed inset-0 bg-m3-surface z-[100] flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
        >
          <div className="p-4 lg:p-6 border-b border-m3-outline/10 flex items-center justify-between bg-m3-surface">
            <div className="flex items-center flex-1 min-w-0">
              {isEditingLocationName ? (
                <input
                  autoFocus
                  type="text"
                  value={editLocationNameValue}
                  onChange={(e) => setEditLocationNameValue(e.target.value)}
                  onBlur={handleUpdateLocationName}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateLocationName();
                    if (e.key === 'Escape') setIsEditingLocationName(false);
                  }}
                  className="text-2xl font-black text-m3-on-surface bg-m3-surface-variant/20 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-m3-primary w-full max-w-md"
                />
              ) : (
                <h2 
                  onClick={() => handleStartEditLocationName(location)}
                  className="text-2xl font-black text-m3-on-surface truncate cursor-pointer hover:text-m3-primary transition-colors"
                  title="Click to rename"
                >
                  {location}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl font-bold transition-all ${
                  isEditMode 
                    ? 'text-m3-primary hover:bg-m3-primary/10' 
                    : 'text-m3-on-surface-variant/60 hover:text-m3-primary hover:bg-m3-primary/10'
                }`}
                title={isEditMode ? 'Done' : 'Edit'}
              >
                {isEditMode ? <X size={20} /> : <Edit2 size={20} />}
              </button>
              <button 
                onClick={onClose}
                className="flex items-center justify-center w-10 h-10 text-m3-on-surface-variant/60 font-bold hover:text-m3-primary hover:bg-m3-primary/10 rounded-xl transition-all"
                title="Reduce"
              >
                <Minimize2 size={20} />
              </button>
              <button 
                onClick={() => setLocationToDelete(location)}
                className="flex items-center justify-center w-10 h-10 text-m3-error font-bold hover:bg-m3-error/10 rounded-xl transition-all"
                title="Delete Location"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-hidden flex flex-col max-w-4xl mx-auto w-full px-2 py-4 lg:px-6 lg:py-8">
            <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
              {(() => {
                const expandedItems = filteredItems.filter(item => item.location === location);
                const usedCount = expandedItems.filter(i => i.used).length;
                
                return (
                  <>
                    <AnimatePresence>
                      {usedCount > 0 && (
                        <motion.div 
                          variants={{
                            hidden: { opacity: 0, height: 0, marginBottom: 0 },
                            visible: { 
                              opacity: 1, 
                              height: 'auto', 
                              marginBottom: 32,
                              transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] }
                            },
                            exit: { 
                              opacity: 0, 
                              height: 0, 
                              marginBottom: 0,
                              transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }
                            }
                          }}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="flex flex-col bg-m3-surface-variant/10 px-5 pb-5 pt-0 rounded-3xl border border-m3-outline/5 overflow-hidden"
                        >
                          <motion.div
                            variants={{
                              hidden: { opacity: 0, y: 8 },
                              visible: { 
                                opacity: 1, 
                                y: 0,
                                transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1], delay: 0.1 }
                              },
                              exit: { 
                                opacity: 0, 
                                y: 8,
                                transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] }
                              }
                            }}
                            className="flex flex-col gap-5"
                          >
                            <div className="flex justify-between items-center px-1">
                              <h3 className="text-xs font-black text-m3-on-surface-variant/40 uppercase tracking-[0.2em]">Batch Operations</h3>
                              <button
                                onClick={() => setLocationToMove(location)}
                                className="text-xs font-bold text-m3-primary hover:underline transition-all uppercase tracking-wider"
                              >
                                Move Selected
                              </button>
                            </div>
                            
                            <div className="flex gap-3">
                              <button
                                onClick={() => handleClearUsed(location)}
                                className="flex-1 py-3 bg-m3-surface text-m3-on-surface-variant rounded-2xl hover:bg-m3-error hover:text-white transition-all text-sm font-bold shadow-sm border border-m3-outline/10"
                              >
                                Clear {usedCount} Used
                              </button>
                              <button
                                onClick={() => handleRestockUsed(location)}
                                className="flex-1 py-3 bg-m3-primary text-m3-on-primary rounded-2xl hover:opacity-90 transition-all text-sm font-bold shadow-sm"
                              >
                                Restock Used
                              </button>
                            </div>
                          </motion.div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {expandedItems.length > 0 ? (
                      <Reorder.Group
                        axis="y"
                        values={expandedItems}
                        onReorder={(newItems) => handleReorderItems(location, newItems)}
                        className="flex-1 flex flex-col gap-2 overflow-y-auto pr-2"
                      >
                        <AnimatePresence>
                          {expandedItems.map((item) => (
                            <InventoryListItem
                              key={item.id}
                              item={item}
                              onToggleUsed={toggleItemUsed}
                              onEdit={startEdit}
                              onDelete={handleDelete}
                              isExpandedView={true}
                              isEditMode={isEditMode}
                              checkboxStyle={checkboxStyle}
                              className="py-1 px-0 hover:bg-m3-surface-variant/10 rounded-xl transition-colors"
                              onReorderEnd={() => syncReorderedItems(location)}
                            />
                          ))}
                        </AnimatePresence>
                      </Reorder.Group>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center py-16">
                        <p className="text-m3-on-surface-variant/60 text-sm font-medium">
                          No items in {location.toLowerCase()}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            <div className="border-t border-m3-outline/5 pt-3 mt-3">
              <button
                onClick={() => {
                  startAddWithLocation(location);
                }}
                className="w-full px-4 py-2 bg-m3-primary text-m3-on-primary rounded-2xl font-bold hover:bg-m3-primary/90 shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={16} />
                Add to {location}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
