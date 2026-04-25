import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  collection, 
  addDoc, 
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../firebase';
import { extractRecipeFromUrl, extractRecipeFromImage, Ingredient } from '../services/geminiService';
import { 
  Plus, 
  Check,
  Loader2,
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TextareaAutosize from 'react-textarea-autosize';

// Import components
import { IngredientItem } from '../components/recipe/IngredientItem';
import { PageHeader } from '../components/layout/PageHeader';

// Import types and utils
import { UNIT_CONVERSIONS } from '../constants/units';
import { handleFirestoreError as baseHandleFirestoreError } from '../utils/firestore';
import { parseShoppingItem, evaluateFraction } from '../utils/shoppingItems';
import { OperationType, Recipe } from '../types';

interface AddRecipePageProps {
  user: User;
  onMenuClick: () => void;
}

export const AddRecipePage: React.FC<AddRecipePageProps> = ({ user, onMenuClick }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const [searchParams] = useSearchParams();
  const initialMode = (searchParams.get('mode') as 'manual' | 'url' | 'image') || 'manual';
  const [mode, setMode] = useState<'manual' | 'url' | 'image'>(initialMode);
  const [urlInput, setUrlInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [form, setForm] = useState<{
    title: string;
    instructions: string;
    sourceUrl: string;
    servings: string;
  }>({
    title: '',
    instructions: '',
    sourceUrl: '',
    servings: ''
  });
  
  const [ingredientSections, setIngredientSections] = useState<{ 
    id: string; 
    title: string; 
    items: { id: string; amount: string; unit: string; name: string }[] 
  }[]>([
    { id: Math.random().toString(36).substr(2, 9), title: '', items: [{ id: Math.random().toString(36).substr(2, 9), amount: '', unit: '', name: '' }] }
  ]);
  
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && user) {
      const fetchRecipe = async () => {
        try {
          const docRef = doc(db, 'recipes', id);
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data() as Recipe;
            if (data.userId !== user.uid) {
              navigate('/recipes');
              return;
            }
            
            setForm({
              title: data.title,
              instructions: data.instructions || '',
              sourceUrl: data.sourceUrl || '',
              servings: data.servings || ''
            });
            
            if (data.ingredientSections && data.ingredientSections.length > 0) {
              setIngredientSections(data.ingredientSections.map(section => ({
                id: Math.random().toString(36).substr(2, 9),
                title: section.title || '',
                items: section.items.map(ing => {
                  if (typeof ing === 'string') {
                    const parsed = parseShoppingItem(ing);
                    return {
                      id: Math.random().toString(36).substr(2, 9),
                      amount: parsed.amount,
                      unit: parsed.unit,
                      name: parsed.name
                    };
                  }
                  return {
                    id: Math.random().toString(36).substr(2, 9),
                    amount: ing.amount || '',
                    unit: ing.unit || '',
                    name: ing.name
                  };
                })
              })));
            } else if (data.ingredients && data.ingredients.length > 0) {
              // Backward compatibility
              setIngredientSections([{
                id: Math.random().toString(36).substr(2, 9),
                title: '',
                items: data.ingredients.map(ing => {
                  if (typeof ing === 'string') {
                    const parsed = parseShoppingItem(ing);
                    return {
                      id: Math.random().toString(36).substr(2, 9),
                      amount: parsed.amount,
                      unit: parsed.unit,
                      name: parsed.name
                    };
                  }
                  return {
                    id: Math.random().toString(36).substr(2, 9),
                    amount: ing.amount || '',
                    unit: ing.unit || '',
                    name: ing.name
                  };
                })
              }]);
            }
          } else {
            navigate('/recipes');
          }
        } catch (error) {
          console.error("Error fetching recipe:", error);
          baseHandleFirestoreError(error, OperationType.GET, `recipes/${id}`);
          navigate('/recipes');
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchRecipe();
    }
  }, [id, isEditing, user, navigate]);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput || !user) return;

    setIsExtracting(true);
    try {
      const extracted = await extractRecipeFromUrl(urlInput);
      populateForm(extracted);
      setForm(prev => ({ ...prev, sourceUrl: urlInput }));
      setMode('manual');
      setUrlInput('');
    } catch (error) {
      handleExtractionError(error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    const preview = URL.createObjectURL(file);
    setSelectedImage({ file, preview });
  };

  const handleImageUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedImage || !user) return;

    setIsExtracting(true);
    try {
      // Convert image to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64 = (reader.result as string).split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(selectedImage.file);
      
      const base64Data = await base64Promise;
      const extracted = await extractRecipeFromImage(base64Data, selectedImage.file.type);
      
      populateForm(extracted);
      setMode('manual');
      setSelectedImage(null);
    } catch (error) {
      handleExtractionError(error);
    } finally {
      setIsExtracting(false);
    }
  };

  const formatInstructions = (text: string): string => {
    if (!text) return '';
    
    // Split by one or more newlines to get individual steps/blocks
    // We use a regex that matches any sequence of newlines and optional whitespace
    const blocks = text.split(/\n\s*\n|\n/).map(b => b.trim()).filter(b => b.length > 0);
    
    const formattedBlocks = blocks.map((block, index) => {
      // Check if block already starts with a number (e.g., "1.", "1)") or a bullet (e.g., "-", "*", "+")
      const numberMatch = block.match(/^(\d+)[\.\)]\s*(.*)/s);
      const bulletMatch = block.match(/^([\*\-\+])\s*(.*)/s);
      
      if (numberMatch) {
        // Re-number to ensure a perfect sequence
        return `${index + 1}. ${numberMatch[2].trim()}`;
      } else if (bulletMatch) {
        // Keep the bullet but ensure proper spacing
        return `${bulletMatch[1]} ${bulletMatch[2].trim()}`;
      } else {
        // Plain text block becomes a numbered step
        return `${index + 1}. ${block}`;
      }
    });
    
    // Join with double newlines to ensure an empty line between every step in the editor
    return formattedBlocks.join('\n\n');
  };

  const populateForm = (extracted: any) => {
    setForm({
      title: extracted.title,
      instructions: formatInstructions(extracted.instructions),
      sourceUrl: '',
      servings: extracted.servings || ''
    });
    
    if (extracted.ingredientSections && extracted.ingredientSections.length > 0) {
      setIngredientSections(extracted.ingredientSections.map((section: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        title: section.title || '',
        items: section.items.map((ing: any) => {
          const ingredientString = typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim();
          const parsed = parseShoppingItem(ingredientString);
          return { 
            id: Math.random().toString(36).substr(2, 9), 
            amount: parsed.amount, 
            unit: parsed.unit, 
            name: parsed.name 
          };
        })
      })));
    } else if (extracted.ingredients) {
      // Handle potential fallback from old extraction logic if any
      setIngredientSections([{
        id: Math.random().toString(36).substr(2, 9),
        title: '',
        items: extracted.ingredients.map((ing: any) => {
          const ingredientString = typeof ing === 'string' ? ing : `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim();
          const parsed = parseShoppingItem(ingredientString);
          return { 
            id: Math.random().toString(36).substr(2, 9), 
            amount: parsed.amount, 
            unit: parsed.unit, 
            name: parsed.name 
          };
        })
      }]);
    }
  };

  const handleExtractionError = (error: any) => {
    if (error instanceof Error && error.message.includes('API key')) {
      alert(`${error.message}\n\nYou can get a free API key from Google AI Studio and add it in Settings.`);
    } else {
      console.error("Extraction error:", error);
      alert("Failed to extract recipe. Please try again. If the issue persists, verify your API key in Settings.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !form.title) return;

    const finalIngredientSections = ingredientSections
      .map(section => ({
        title: section.title,
        items: section.items
          .filter(ing => ing.name.trim() !== '')
          .map(({ id, ...rest }) => rest)
      }))
      .filter(section => section.items.length > 0);

    setIsSaving(true);
    try {
      const recipeData: any = {
        title: form.title,
        ingredientSections: finalIngredientSections,
        instructions: form.instructions || '',
        servings: form.servings || '',
        userId: user.uid,
        updatedAt: Timestamp.now()
      };

      if (!isEditing) {
        recipeData.createdAt = Timestamp.now();
      }

      // Only add optional fields if they have values
      if (form.sourceUrl && form.sourceUrl.trim()) {
        recipeData.sourceUrl = form.sourceUrl.trim();
      }

      if (isEditing) {
        await updateDoc(doc(db, 'recipes', id), recipeData);
      } else {
        await addDoc(collection(db, 'recipes'), recipeData);
      }
      
      navigate('/recipes');
    } catch (error) {
      console.error('Error saving recipe:', error);
      baseHandleFirestoreError(error, isEditing ? OperationType.UPDATE : OperationType.CREATE, 'recipes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvert = (sectionIndex: number, itemIndex: number, targetUnit: string) => {
    const section = ingredientSections[sectionIndex];
    if (!section) return;
    const ing = section.items[itemIndex];
    if (!ing || !ing.unit || !targetUnit) return;

    // Strip "can" or "bottle" for conversion lookup
    const baseSourceUnit = ing.unit.replace(/\s+(can|bottle)s?$/i, '').toLowerCase();
    const baseTargetUnit = targetUnit.replace(/\s+(can|bottle)s?$/i, '').toLowerCase();

    if (!UNIT_CONVERSIONS[baseSourceUnit]?.[baseTargetUnit]) return;
    
    const numericAmount = evaluateFraction(ing.amount);

    if (Array.isArray(numericAmount)) {
      const conv = UNIT_CONVERSIONS[baseSourceUnit][baseTargetUnit];
      const convertedStart = numericAmount[0] * conv;
      const convertedEnd = numericAmount[1] * conv;
      const formatted = `${Math.round(convertedStart * 100) / 100}-${Math.round(convertedEnd * 100) / 100}`;
      
      const newSections = [...ingredientSections];
      newSections[sectionIndex].items[itemIndex] = { ...ing, amount: formatted, unit: targetUnit };
      setIngredientSections(newSections);
      return;
    }

    if (isNaN(numericAmount) || (typeof numericAmount === 'number' && numericAmount === 0)) return;

    const convertedAmount = (numericAmount as number) * UNIT_CONVERSIONS[baseSourceUnit][baseTargetUnit];
    const roundedAmount = Math.round(convertedAmount * 100) / 100;

    const newSections = [...ingredientSections];
    newSections[sectionIndex].items[itemIndex] = { ...ing, amount: roundedAmount.toString(), unit: targetUnit };
    setIngredientSections(newSections);
  };

  const handleMoveIngredientUp = (sectionIndex: number, itemIndex: number) => {
    if (itemIndex === 0) return;
    const newSections = [...ingredientSections];
    const section = { ...newSections[sectionIndex] };
    const items = [...section.items];
    const [movedItem] = items.splice(itemIndex, 1);
    items.splice(itemIndex - 1, 0, movedItem);
    section.items = items;
    newSections[sectionIndex] = section;
    setIngredientSections(newSections);
  };

  const handleMoveIngredientDown = (sectionIndex: number, itemIndex: number) => {
    const newSections = [...ingredientSections];
    const section = { ...newSections[sectionIndex] };
    if (itemIndex === section.items.length - 1) return;
    const items = [...section.items];
    const [movedItem] = items.splice(itemIndex, 1);
    items.splice(itemIndex + 1, 0, movedItem);
    section.items = items;
    newSections[sectionIndex] = section;
    setIngredientSections(newSections);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 flex flex-col h-[100dvh] overflow-hidden bg-m3-surface"
    >
      <PageHeader 
        title={isEditing ? 'Edit Recipe' : mode === 'url' ? 'Add from URL' : mode === 'image' ? 'Add from Image' : 'Add New Recipe'} 
        showBack 
        onBack={() => isEditing ? navigate(`/recipe/${id}`) : navigate('/recipes')}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-8 lg:px-8 min-h-0">
        <div className="max-w-4xl mx-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-m3-primary" size={48} />
              <p className="text-m3-on-surface-variant font-medium">Loading recipe details...</p>
            </div>
          ) : mode === 'url' ? (
            /* URL Extraction Mode */
            <div className="space-y-8">
              <form onSubmit={handleExtract} className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-m3-primary uppercase tracking-[0.2em]">Recipe URL</label>
                  <input 
                    type="url" 
                    required
                    placeholder="https://example.com/delicious-recipe"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    className="w-full px-8 py-5 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-[24px] text-m3-on-surface placeholder:text-m3-on-surface-variant/50 focus:ring-2 focus:ring-m3-primary/30 outline-none transition-all text-lg shadow-inner"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={isExtracting}
                  className="w-full py-5 bg-m3-primary text-m3-on-primary rounded-[24px] font-black hover:bg-m3-primary/90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 text-xl"
                >
                  {isExtracting && <Loader2 className="animate-spin" size={24} />}
                  {isExtracting ? 'Extracting Recipe...' : 'Extract Recipe'}
                </button>
              </form>
              
              <div className="space-y-3 text-center max-w-2xl mx-auto">
                <p className="text-sm text-m3-on-surface-variant/60">
                  Works with NYT Cooking, AllRecipes, Food Network, and many more recipe sites.
                </p>
                <p className="text-xs text-m3-on-surface-variant/50">
                  Requires a free Gemini API key. Add yours in Settings → API Configuration.
                </p>
              </div>
            </div>
          ) : mode === 'image' ? (
            /* Image Extraction Mode */
            <div className="space-y-8">
              <form onSubmit={handleImageUpload} className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-4">
                  <label className="block text-xs font-black text-m3-primary uppercase tracking-[0.2em]">Recipe Image</label>
                  
                  {!selectedImage ? (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-m3-outline/20 rounded-[32px] bg-m3-surface-variant/10 hover:bg-m3-surface-variant/20 transition-all cursor-pointer group">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <div className="p-4 bg-m3-primary/10 rounded-full mb-4 group-hover:scale-110 transition-transform">
                          <Upload className="text-m3-primary" size={32} />
                        </div>
                        <p className="mb-2 text-lg font-bold text-m3-on-surface">Click to upload or drag and drop</p>
                        <p className="text-sm text-m3-on-surface-variant/60">PNG, JPG or WEBP (MAX. 5MB)</p>
                      </div>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageSelect}
                      />
                    </label>
                  ) : (
                    <div className="relative rounded-[32px] overflow-hidden border border-m3-outline/20 shadow-lg group">
                      <img 
                        src={selectedImage.preview} 
                        alt="Selected recipe" 
                        className="w-full h-auto max-h-[400px] object-contain bg-black/5"
                      />
                      <button 
                        type="button"
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isExtracting || !selectedImage}
                  className="w-full py-5 bg-m3-primary text-m3-on-primary rounded-[24px] font-black hover:bg-m3-primary/90 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-3 text-xl"
                >
                  {isExtracting && <Loader2 className="animate-spin" size={24} />}
                  {isExtracting ? 'Extracting Recipe...' : 'Extract Recipe'}
                </button>
              </form>

              <div className="space-y-3 text-center max-w-2xl mx-auto">
                <p className="text-sm text-m3-on-surface-variant/60">
                  Upload a photo of a cookbook page, a handwritten recipe, or a screenshot.
                </p>
                <p className="text-xs text-m3-on-surface-variant/50">
                  Requires a free Gemini API key. Add yours in Settings → API Configuration.
                </p>
              </div>
            </div>
          ) : (
            /* Manual Entry Mode */
            <form onSubmit={handleSave} className="space-y-10">
            <div className="space-y-4">
              <label className="block text-xs font-black text-m3-primary uppercase tracking-[0.2em]">Recipe Title</label>
              <TextareaAutosize 
                required
                value={form.title}
                onChange={e => setForm({...form, title: e.target.value})}
                className="w-full px-6 py-4 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-[20px] focus:bg-m3-surface-variant/30 focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary outline-none resize-none text-xl font-bold text-m3-on-surface transition-all"
                minRows={1}
                placeholder="Enter recipe title"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-m3-primary uppercase tracking-[0.2em]">Servings</label>
              <input 
                type="text"
                value={form.servings}
                onChange={e => setForm({...form, servings: e.target.value})}
                className="w-full px-6 py-4 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-[20px] focus:bg-m3-surface-variant/30 focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary outline-none text-m3-on-surface transition-all font-medium"
                placeholder="e.g., 4, Serves 6, 12 cookies"
              />
            </div>

            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-m3-primary uppercase tracking-[0.2em]">Ingredients</label>
                <button 
                  type="button"
                  onClick={() => setIngredientSections([...ingredientSections, { id: Math.random().toString(36).substr(2, 9), title: '', items: [{ id: Math.random().toString(36).substr(2, 9), amount: '', unit: '', name: '' }] }])}
                  className="text-sm text-m3-primary font-black hover:bg-m3-primary/10 px-4 py-2 rounded-full flex items-center gap-2 transition-all"
                >
                  <Plus size={18} /> Add Section
                </button>
              </div>
              
              <div className="space-y-16">
                {ingredientSections.map((section, sIdx) => (
                  <div key={section.id} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <input 
                        type="text"
                        value={section.title}
                        onChange={e => {
                          const newSections = [...ingredientSections];
                          newSections[sIdx].title = e.target.value;
                          setIngredientSections(newSections);
                        }}
                        className="flex-1 min-w-0 bg-transparent border-b border-m3-outline/20 py-2 text-lg font-black text-m3-on-surface focus:border-m3-primary outline-none transition-all"
                        placeholder="Section Title"
                      />
                      {ingredientSections.length > 1 && (
                        <button 
                          type="button"
                          onClick={() => setIngredientSections(ingredientSections.filter(s => s.id !== section.id))}
                          className="p-2 text-m3-on-surface-variant/40 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                        >
                          <X size={20} />
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <AnimatePresence initial={false} mode="popLayout">
                        {section.items.map((ing, iIdx) => (
                          <IngredientItem 
                            key={ing.id}
                            ing={ing}
                            index={iIdx}
                            onUpdate={(idx, fieldOrObject, value?) => {
                              const newSections = [...ingredientSections];
                              if (typeof fieldOrObject === 'object') {
                                newSections[sIdx].items[idx] = { ...newSections[sIdx].items[idx], ...fieldOrObject };
                              } else {
                                newSections[sIdx].items[idx] = { ...newSections[sIdx].items[idx], [fieldOrObject]: value };
                              }
                              setIngredientSections(newSections);
                            }}
                            onRemove={(id) => {
                              const newSections = [...ingredientSections];
                              newSections[sIdx].items = newSections[sIdx].items.filter(item => item.id !== id);
                              setIngredientSections(newSections);
                            }}
                            onConvert={(idx, targetUnit) => handleConvert(sIdx, idx, targetUnit)}
                            onMoveUp={() => handleMoveIngredientUp(sIdx, iIdx)}
                            onMoveDown={() => handleMoveIngredientDown(sIdx, iIdx)}
                            isFirst={iIdx === 0}
                            isLast={iIdx === section.items.length - 1}
                          />
                        ))}
                      </AnimatePresence>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        const newSections = [...ingredientSections];
                        newSections[sIdx].items.push({ id: Math.random().toString(36).substr(2, 9), amount: '', unit: '', name: '' });
                        setIngredientSections(newSections);
                      }}
                      className="w-full py-3 border-2 border-dashed border-m3-outline/10 rounded-2xl text-m3-on-surface-variant/60 hover:text-m3-primary hover:border-m3-primary/30 hover:bg-m3-primary/5 transition-all text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <Plus size={16} /> Add Ingredient to {section.title || 'Section'}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-black text-m3-primary uppercase tracking-[0.2em]">Instructions (Markdown)</label>
                <button 
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, instructions: formatInstructions(prev.instructions) }))}
                  className="text-xs text-m3-primary font-black hover:bg-m3-primary/10 px-3 py-1.5 rounded-full transition-all"
                >
                  Clean Up Formatting
                </button>
              </div>
              <textarea 
                rows={10}
                required
                value={form.instructions}
                onChange={e => setForm({...form, instructions: e.target.value})}
                className="w-full px-6 py-5 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-[24px] focus:bg-m3-surface-variant/30 focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary outline-none resize-none text-m3-on-surface transition-all font-medium leading-relaxed"
                placeholder="1. Preheat oven to 350°F&#10;2. Mix ingredients&#10;3. Bake for 25 minutes"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-xs font-black text-m3-primary uppercase tracking-[0.2em]">Source URL (Optional)</label>
              <TextareaAutosize 
                value={form.sourceUrl}
                onChange={e => setForm({...form, sourceUrl: e.target.value})}
                className="w-full px-6 py-4 bg-m3-surface-variant/20 border border-m3-outline/20 rounded-[20px] focus:bg-m3-surface-variant/30 focus:ring-2 focus:ring-m3-primary/20 focus:border-m3-primary outline-none resize-none text-m3-on-surface transition-all font-medium"
                minRows={1}
                placeholder="https://example.com/original-recipe"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-8 border-t border-m3-outline/10">
              <button 
                type="button"
                onClick={() => isEditing ? navigate(`/recipe/${id}`) : navigate('/recipes')}
                className="px-6 py-2.5 rounded-full font-semibold text-sm text-m3-primary hover:bg-m3-primary/8 transition-all active:scale-95"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-8 py-2.5 bg-m3-primary text-m3-on-primary rounded-full font-semibold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            </form>
          )}
        </div>
      </main>
    </motion.div>
  );
};