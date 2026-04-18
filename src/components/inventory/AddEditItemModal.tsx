import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { InventoryItem } from '../../types';
import { INVENTORY_UNITS } from '../../constants/units';

interface AddEditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingItem: InventoryItem | null;
  activeTab: 'ingredients' | 'supplies';
  formData: {
    name: string;
    quantity: string;
    unit: string;
    location: string;
    purchasedOn: string;
    notes: string;
  };
  setFormData: (data: any) => void;
  smartInput: string;
  setSmartInput: (val: string) => void;
  useSmartInput: boolean;
  toggleInputMode: () => void;
  handleSmartInputParse: () => void;
  handleSmartKeyDown: (e: React.KeyboardEvent) => void;
  handleSubmit: (e: React.FormEvent) => void;
  currentLocations: string[];
}

export const AddEditItemModal: React.FC<AddEditItemModalProps> = ({
  isOpen,
  onClose,
  editingItem,
  activeTab,
  formData,
  setFormData,
  smartInput,
  setSmartInput,
  useSmartInput,
  toggleInputMode,
  handleSmartInputParse,
  handleSmartKeyDown,
  handleSubmit,
  currentLocations
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-[110]"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-m3-surface rounded-[32px] p-6 lg:p-8 w-full max-w-lg shadow-xl border border-m3-outline/10 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-m3-on-surface">
                {editingItem ? 'Edit' : 'Add'} {activeTab === 'ingredients' ? 'Ingredient' : 'Supply'}
              </h3>
              <button
                onClick={onClose}
                className="p-2 text-m3-on-surface-variant/40 hover:text-m3-primary hover:bg-m3-primary/10 rounded-full transition-all"
                title="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Smart Input for Items */}
              {useSmartInput ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-bold text-m3-on-surface-variant">
                      {activeTab === 'ingredients' ? 'Ingredient' : 'Supply'} *
                    </label>
                    <button
                      type="button"
                      onClick={toggleInputMode}
                      className="text-xs text-m3-primary font-bold hover:text-m3-primary/80"
                    >
                      Individual Fields
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder={activeTab === 'ingredients' ? 'e.g. 1 bottle olive oil' : 'e.g. 6 rolls paper towels'}
                    value={smartInput}
                    onChange={(e) => setSmartInput(e.target.value)}
                    onBlur={handleSmartInputParse}
                    onKeyDown={handleSmartKeyDown}
                    className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                    required
                  />
                  <p className="text-xs text-m3-on-surface-variant/60 mt-1">
                    Type {activeTab === 'ingredients' ? 'ingredient' : 'supply'} with quantity & unit (e.g. "{activeTab === 'ingredients' ? '1 bottle olive oil' : '6 rolls paper towels'}"). Press Enter or click away to parse.
                  </p>
                  
                  {/* Show parsed values */}
                  {(formData.name || formData.quantity || formData.unit) && (
                    <div className="mt-3 p-3 bg-m3-surface-variant/10 rounded-xl">
                      <div className="text-xs text-m3-on-surface-variant/60 mb-1">Parsed:</div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-m3-on-surface-variant/60">Quantity</div>
                          <div className="font-medium">{formData.quantity || 'None'}</div>
                        </div>
                        <div>
                          <div className="text-m3-on-surface-variant/60">Unit</div>
                          <div className="font-medium">{formData.unit || 'None'}</div>
                        </div>
                        <div>
                          <div className="text-m3-on-surface-variant/60">Name</div>
                          <div className="font-medium">{formData.name || 'None'}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Individual Fields */
                <>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-bold text-m3-on-surface-variant">
                        Name *
                      </label>
                      <button
                        type="button"
                        onClick={toggleInputMode}
                        className="text-xs text-m3-primary font-bold hover:text-m3-primary/80"
                      >
                        Smart Input
                      </button>
                    </div>
                    <input
                      type="text"
                      placeholder={`e.g. ${activeTab === 'ingredients' ? 'Extra Virgin Olive Oil' : 'Paper Towels'}`}
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                        Quantity
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2"
                        value={formData.quantity}
                        onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                        className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                        Unit
                      </label>
                      <select
                        value={formData.unit}
                        onChange={(e) => setFormData({...formData, unit: e.target.value})}
                        className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                      >
                        <option value="">Select unit</option>
                        {INVENTORY_UNITS[activeTab].map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                  Location
                </label>
                <select
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                >
                  <option value="">Select location</option>
                  {currentLocations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              {activeTab === 'ingredients' && (
                <div>
                  <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                    Purchased On (Optional)
                  </label>
                  <input
                    type="date"
                    value={formData.purchasedOn}
                    onChange={(e) => setFormData({...formData, purchasedOn: e.target.value})}
                    className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-m3-on-surface-variant mb-2">
                  Notes
                </label>
                <textarea
                  placeholder="Additional notes or details"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-4 py-3 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-2xl outline-none focus:border-m3-primary font-medium resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-[0.4] py-2.5 px-6 border border-m3-outline text-m3-primary rounded-[20px] font-medium hover:bg-m3-primary/8 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-[0.6] py-2.5 px-6 bg-m3-primary text-m3-on-primary rounded-[20px] font-medium hover:bg-m3-primary/90 shadow-sm hover:shadow-md transition-all"
                >
                  {editingItem ? 'Update' : 'Add'}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
