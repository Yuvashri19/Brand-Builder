import { useState } from "react";
import {
  Sparkles,
  Layers,
  Plus,
  RefreshCw,
  CheckCircle2,
  Download,
  AlertCircle,
  Info,
  Image as ImageIcon,
  Maximize2,
  X,
  Palette,
  Clipboard,
  ExternalLink,
  ChevronRight,
  HelpCircle
} from "lucide-react";

interface BrandMedium {
  id: string;
  name: string;
  aspectRatio: string;
  targetPrompt: string;
  creativeDirection: string;
  generatedUrl?: string;
  isGenerating?: boolean;
  error?: string;
}

interface BrandSpec {
  brandMasterSpec: string;
  tagline: string;
  mediums: BrandMedium[];
}

const PRESETS = [
  {
    name: "Solas Flask",
    category: "Premium Drinkware",
    description: "A double-walled high-grade titanium water bottle with a pristine cylindrical body and metallic satin edge finish. Raw matte metallic charcoal finish, accented by a knurled copper screw-cap. Has an elegant debossed minimal solar outline icon near the base. Displayed as a premium isolated object.",
    hexColors: "Charcoal Charcoal (#1C1E21), Matte Copper (#B36D48), Satin Steel (#7E8B96)",
    styleNotes: "Ultra-minimalist, sleek, modern industrial luxury. High-end studio layout."
  },
  {
    name: "Aether Sound Pods",
    category: "Consumer Electronics",
    description: "Sleek open-ear wireless earbuds made of polished pearl-white ceramic and transparent sapphire acrylic detailing. The pod body is a smooth, leaf-shaped organic pebble. Exposes golden circular micro-acoustic drivers behind a geometric speaker grill. Isolated premium gadget aesthetic.",
    hexColors: "Pearl White (#F5F5F7), Clear Sapphire (#89A5C0), Rose Gold (#D6A284)",
    styleNotes: "Organic futurism, clean, airy architectural design, studio floating presentation."
  },
  {
    name: "Oasis Botanicals Serum",
    category: "Luxury Skincare",
    description: "An Amber glass dropper bottle with a exceptionally thick solid-glass base. The serum inside is a golden-sage bi-phase oil with tiny suspended botanical bubbles. Features a minimalist textured sand-colored cotton label with high-contrast sharp black serif text reading 'OASIS'. Clean apothecary style.",
    hexColors: "Amber Gold (#CBA358), Herbal Sage (#7C8D80), Warm Sand (#EFECE6)",
    styleNotes: "Organic botanical minimalist, pristine daylight cast shadow, pure empty environment."
  }
];

export default function App() {
  // Input states
  const [productName, setProductName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [description, setDescription] = useState("");
  const [hexColors, setHexColors] = useState("");
  const [styleNotes, setStyleNotes] = useState("");

  // UI state managers
  const [isSpecGenerating, setIsSpecGenerating] = useState(false);
  const [brandSpec, setBrandSpec] = useState<BrandSpec | null>(null);
  const [activeMediumId, setActiveMediumId] = useState<string>("");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Custom Medium creation states
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customMediumName, setCustomMediumName] = useState("");
  const [customMediumRatio, setCustomMediumRatio] = useState("1:1");
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Fullscreen modal image
  const [fullscreenImage, setFullscreenImage] = useState<{ url: string; medium: string } | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show Toast Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Populate presets
  const applyPreset = (preset: typeof PRESETS[0]) => {
    setProductName(preset.name);
    setProductCategory(preset.category);
    setDescription(preset.description);
    setHexColors(preset.hexColors);
    setStyleNotes(preset.styleNotes);
    triggerToast(`Applied "${preset.name}" product template!`);
  };

  // Helper code copy
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`Copied ${label} to clipboard!`);
  };

  // Step 1: Submit description to get consistent brand specification
  const generateBrandBlueprint = async () => {
    if (!productName.trim() || !description.trim()) {
      setErrorBanner("Product Name and Product Description are required to build a Brand Spec.");
      return;
    }

    setErrorBanner(null);
    setIsSpecGenerating(true);
    setBrandSpec(null);

    try {
      const response = await fetch("/api/brand/spec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          productCategory,
          description,
          hexColors,
          styleNotes,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      setBrandSpec(data);
      if (data.mediums && data.mediums.length > 0) {
        setActiveMediumId(data.mediums[0].id);
      }
      triggerToast("Brand Blueprints and tailored Prompts created!");
    } catch (err: any) {
      console.error(err);
      setErrorBanner(`Failed to create Brand Spec: ${err.message || err}`);
    } finally {
      setIsSpecGenerating(false);
    }
  };

  // Step 2: Request image shot using the specific model
  const generateShot = async (mediumId: string) => {
    if (!brandSpec) return;

    // Direct state mutation helper for clean responsive reactivity
    const updatedMediums = brandSpec.mediums.map((med) => {
      if (med.id === mediumId) {
        return { ...med, isGenerating: true, error: undefined };
      }
      return med;
    });
    setBrandSpec({ ...brandSpec, mediums: updatedMediums });

    const mediumToGen = brandSpec.mediums.find((m) => m.id === mediumId);
    if (!mediumToGen) return;

    try {
      const response = await fetch("/api/brand/generate-shot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: mediumToGen.targetPrompt,
          aspectRatio: mediumToGen.aspectRatio,
          modelType: "gemini-2.5-flash-image", // Nano-Banana
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Generation failed (${response.status})`);
      }

      const data = await response.json();

      setBrandSpec((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mediums: prev.mediums.map((m) => {
            if (m.id === mediumId) {
              return { ...m, generatedUrl: data.imageUrl, isGenerating: false };
            }
            return m;
          }),
        };
      });
      triggerToast(`Successfully generated physical rendering for ${mediumToGen.name}!`);
    } catch (err: any) {
      console.error(err);
      setBrandSpec((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mediums: prev.mediums.map((m) => {
            if (m.id === mediumId) {
              return { ...m, isGenerating: false, error: err.message || "Failed to generate image" };
            }
            return m;
          }),
        };
      });
    }
  };

  // Step 3: Add custom medium on-the-fly incorporating the consistency rules
  const handleAddCustomMedium = async () => {
    if (!brandSpec || !customMediumName.trim()) return;

    setIsAddingCustom(true);
    try {
      const response = await fetch("/api/brand/custom-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandMasterSpec: brandSpec.brandMasterSpec,
          customMedium: customMediumName,
          aspectRatio: customMediumRatio,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create custom prompt");
      }

      const data = await response.json();
      const newId = `custom_${Date.now()}`;
      const newMedium: BrandMedium = {
        id: newId,
        name: data.name || customMediumName,
        aspectRatio: data.aspectRatio || customMediumRatio,
        targetPrompt: data.targetPrompt,
        creativeDirection: data.creativeDirection || "Custom imagined space.",
      };

      setBrandSpec((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          mediums: [...prev.mediums, newMedium],
        };
      });

      setActiveMediumId(newId);
      setShowCustomModal(false);
      setCustomMediumName("");
      triggerToast(`Added custom medium: ${newMedium.name}!`);
    } catch (err: any) {
      console.error(err);
      triggerToast(`Could not generate medium: ${err.message || err}`);
    } finally {
      setIsAddingCustom(false);
    }
  };

  // Helper to sync edited prompt changes by the art director directly
  const updatePromptText = (mediumId: string, newText: string) => {
    if (!brandSpec) return;
    setBrandSpec({
      ...brandSpec,
      mediums: brandSpec.mediums.map((m) => {
        if (m.id === mediumId) {
          return { ...m, targetPrompt: newText };
        }
        return m;
      }),
    });
  };

  const activeMediumObj = brandSpec?.mediums.find((m) => m.id === activeMediumId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col selection:bg-teal-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-teal-500/30 text-teal-400 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-teal-400 flex-shrink-0 animate-pulse" />
          <span className="text-sm font-medium tracking-wide font-display">{toastMessage}</span>
        </div>
      )}

      {/* Global Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/10">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight font-display bg-gradient-to-r from-teal-400 to-indigo-200 bg-clip-text text-transparent">
                Brand Builder Studio
              </h1>
              <p className="text-xs text-slate-400 font-sans font-medium tracking-wide">
                Consistent Medium Visualizer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full text-xs font-mono font-medium tracking-wider uppercase">
              Model: Nano-Banana (gemini-2.5-flash-image)
            </span>
            <a
              href="https://ai.studio/build"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors border border-slate-800 rounded-lg px-2.5 py-1.5"
            >
              Google AI Studio
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content Workspace Grid */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Input Configuration & Creative Control (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6" id="input-config-panel">
          
          {/* Section Heading info banner */}
          <div className="bg-slate-900/40 rounded-2xl p-5 border border-slate-900 space-y-3">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-teal-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-slate-200 text-sm font-display">Consistent Multi-Scenario Ideation</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Describe a product and view it across varied mediums with 
                  <strong> locked consistency</strong>. Gemini generates detailed physical blueprints, 
                  synthesizes consistent prompts, and uses <strong>Nano-Banana</strong> for the imaging.
                </p>
              </div>
            </div>
            {/* Guarantee badge */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center gap-2 text-[11px] text-teal-300 font-mono">
              <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-ping"></span>
              Negative Human filter: Humans, hands, &amp; silhouettes are strictly prohibited.
            </div>
          </div>

          {/* Quick Setup presets */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-5">
            <span className="text-xs font-medium text-slate-400 tracking-wider block mb-3 font-display">
              Or Try A Premium Product Template:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-2 bg-slate-900 hover:bg-slate-850 hover:border-slate-700/60 transition-all rounded-xl text-left border border-slate-800/80 group"
                >
                  <p className="text-xs font-semibold text-slate-200 font-display group-hover:text-teal-400 transition-colors truncate">
                    {p.name}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5 truncate">{p.category}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Product specifications form */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-900 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-900">
              <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-400">
                <Palette className="w-4.5 h-4.5" />
              </div>
              <h2 className="font-semibold text-slate-200 font-display">Product Anatomy</h2>
            </div>

            {errorBanner && (
              <div className="p-3.5 bg-red-950/40 border border-red-550/30 rounded-xl text-red-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span>{errorBanner}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Product Name & Category in single row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-name" className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">
                    Product name *
                  </label>
                  <input
                    id="p-name"
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    placeholder="e.g. Apex Chrono Watch"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label htmlFor="p-category" className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">
                    Product category
                  </label>
                  <input
                    id="p-category"
                    type="text"
                    value={productCategory}
                    onChange={(e) => setProductCategory(e.target.value)}
                    placeholder="e.g. Smart Wearables"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Product Description */}
              <div>
                <label htmlFor="p-desc" className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">
                  Detailed Description *
                </label>
                <textarea
                  id="p-desc"
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe physical shape, texture materials (anodized aluminum, matte ceramics, tinted curves), exact branding details, layout style."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600 resize-none leading-relaxed"
                />
              </div>

              {/* Brand Color scheme & Aesthetic Style */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="p-colors" className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">
                    Brand Color Swatches
                  </label>
                  <input
                    id="p-colors"
                    type="text"
                    value={hexColors}
                    onChange={(e) => setHexColors(e.target.value)}
                    placeholder="e.g. Copper (#D4AF37), Navy"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
                <div>
                  <label htmlFor="p-style" className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">
                    Style Tone / Aesthetic
                  </label>
                  <input
                    id="p-style"
                    type="text"
                    value={styleNotes}
                    onChange={(e) => setStyleNotes(e.target.value)}
                    placeholder="e.g. Warm minimal, high-end"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* CTA to generate complete spec */}
            <button
              onClick={generateBrandBlueprint}
              disabled={isSpecGenerating}
              className="w-full h-12 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/10 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSpecGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  Generating Brand Spec...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  Create Brand Spec &amp; Prompts
                </>
              )}
            </button>
          </div>

          {/* Render Active Brand Specifications summary if loaded */}
          {brandSpec && (
            <div className="bg-gradient-to-br from-indigo-950/30 to-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-900/30">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-teal-400 rounded-full"></div>
                  <span className="text-xs uppercase font-semibold text-slate-300 font-mono tracking-wider">
                    Creative Brand Guidebook
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(brandSpec.brandMasterSpec, "Brand Spec")}
                  className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Copy Spec
                </button>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase block">
                  Audience Catchphrase / Tagline
                </span>
                <p className="italic font-display font-bold text-slate-100 text-lg">
                  &ldquo;{brandSpec.tagline}&rdquo;
                </p>
              </div>

              <div className="space-y-2">
                <span className="text-[10px] text-indigo-400 font-bold tracking-widest uppercase block">
                  Product Blueprint &amp; Feature Anchors
                </span>
                <p className="text-xs leading-relaxed text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-900 overflow-y-auto max-h-48 font-sans">
                  {brandSpec.brandMasterSpec}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: Interactive Generation Bay (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6" id="brand-imaging-bay">
          
          {/* Main Visualizer Header */}
          <div className="bg-slate-900/40 rounded-2xl border border-slate-900 p-6 flex flex-col gap-4">
            
            {/* Top info and tabs indicator if brand board loaded */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold font-display tracking-tight text-slate-200">
                  Scenario Render Laboratory
                </h2>
                <p className="text-xs text-slate-400">
                  Execute mock layouts inside real medium backdrops
                </p>
              </div>

              {brandSpec && (
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 hover:border-slate-700 transition-all border border-slate-800 rounded-xl text-xs font-semibold text-teal-400 flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Imagine Custom Medium
                </button>
              )}
            </div>

            {/* If state empty */}
            {!brandSpec && (
              <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-950 flex items-center justify-center border border-slate-900">
                  <ImageIcon className="w-7 h-7 text-slate-600" />
                </div>
                <div className="max-w-sm">
                  <h3 className="font-semibold font-display text-slate-300 text-sm">No Brand Spec active</h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                    Provide your product description on the left panel and click 
                    <strong> "Create Brand Spec"</strong>. You can then render the product seamlessly 
                    across three mediums sequentially.
                  </p>
                </div>
                {/* Visual indicator of the 3 mediums */}
                <div className="flex gap-4 pt-1 text-slate-600 text-xs font-mono select-none">
                  <span className="flex items-center gap-1">📺 16:9 Billboard</span>
                  <span className="flex items-center gap-1">📰 4:3 Newspaper</span>
                  <span className="flex items-center gap-1">📱 1:1 Social</span>
                </div>
              </div>
            )}

            {/* Tabs for selected mediums if loaded */}
            {brandSpec && (
              <div className="space-y-4">
                {/* Horizontal tabs */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-slate-950 border border-slate-900 rounded-xl">
                  {brandSpec.mediums.map((med) => {
                    const isActive = med.id === activeMediumId;
                    const hasImage = !!med.generatedUrl;
                    return (
                      <button
                        key={med.id}
                        onClick={() => setActiveMediumId(med.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all flex items-center gap-2 cursor-pointer ${
                          isActive
                            ? "bg-gradient-to-r from-teal-500/15 to-indigo-500/20 text-teal-300 border border-teal-500/30 font-medium"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent"
                        }`}
                      >
                        <span className="capitalize">{med.name}</span>
                        <span className="text-[10px] font-mono px-1 py-0.5 bg-slate-900 rounded text-slate-500">
                          {med.aspectRatio}
                        </span>
                        {hasImage && (
                          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Main Render Card for currently active tab */}
                {activeMediumObj && (
                  <div className="space-y-6">
                    {/* Viewport Box */}
                    <div className="bg-slate-950 rounded-xl overflow-hidden border border-slate-900 relative group flex flex-col">
                      
                      {/* Image block */}
                      <div className="aspect-video bg-slate-900 flex items-center justify-center relative select-none">
                        {activeMediumObj.generatedUrl ? (
                          <div className="relative w-full h-full group/img">
                            <img
                              src={activeMediumObj.generatedUrl}
                              alt={`${brandSpec.tagline} ad rendering for ${activeMediumObj.name}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                            {/* Hover enlarge button */}
                            <button
                              onClick={() => setFullscreenImage({ url: activeMediumObj.generatedUrl!, medium: activeMediumObj.name })}
                              className="absolute top-4 right-4 bg-slate-950/80 border border-slate-800 p-2 rounded-lg text-slate-300 hover:text-white cursor-pointer opacity-0 group-hover/img:opacity-100 transition-opacity"
                            >
                              <Maximize2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : activeMediumObj.isGenerating ? (
                          <div className="flex flex-col items-center justify-center p-8 space-y-4 max-w-sm text-center">
                            <div className="w-12 h-12 border-2 border-teal-500/30 border-t-teal-400 rounded-full animate-spin"></div>
                            <div>
                              <p className="text-xs font-semibold text-slate-200">
                                Imaging via <span className="text-teal-400">gemini-2.5-flash-image</span>
                              </p>
                              <span className="text-[10px] text-slate-500 mt-1 block">
                                Directing physical product details. Enforcing vacant scene...
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-12 text-center text-slate-600 space-y-3">
                            <ImageIcon className="w-10 h-10 text-slate-700" />
                            <div>
                              <p className="text-xs font-semibold text-slate-400">Ready to Visualize</p>
                              <p className="text-[10px] text-slate-500 mt-0.5">Configure prompt description below if needed</p>
                            </div>
                          </div>
                        )}

                        {/* Top corner watermark */}
                        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-800/80 rounded-lg px-2.5 py-1 text-[9px] font-mono font-medium tracking-widest text-slate-400 uppercase">
                          ⚡ PREVIEW VIEWPORT ({activeMediumObj.aspectRatio})
                        </div>

                        {/* Status bar */}
                        <div className="absolute bottom-0 inset-x-0 bg-slate-950/90 border-t border-slate-900 px-4 py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                            <span className="text-slate-400 font-medium">Nano-Banana Model Locked</span>
                          </div>
                          {activeMediumObj.generatedUrl && (
                            <a
                              href={activeMediumObj.generatedUrl}
                              download={`brand_builder_${activeMediumObj.id}.png`}
                              className="text-teal-400 hover:text-teal-300 font-semibold flex items-center gap-1.5"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Save Asset
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Creative Controls / Prompts Editor section */}
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-900">
                        <div>
                          <h3 className="text-xs uppercase font-mono font-bold tracking-widest text-indigo-400">
                            Art Direction &amp; Shot Prompt
                          </h3>
                          <p className="text-slate-400 text-[11px] italic mt-0.5">
                            {activeMediumObj.creativeDirection}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-950 border border-slate-800/80 text-teal-400 rounded-lg text-[10px] font-mono">
                            Aspect: {activeMediumObj.aspectRatio}
                          </span>
                        </div>
                      </div>

                      {/* Explicit Error message if generation fails */}
                      {activeMediumObj.error && (
                        <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-200 rounded-xl text-xs flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-semibold">Image Generation Error</p>
                            <p className="text-slate-400 mt-0.5 text-[11px]">{activeMediumObj.error}</p>
                          </div>
                        </div>
                      )}

                      {/* Custom editable prompt block */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label htmlFor="prompt-input" className="text-xs font-semibold text-slate-400">
                            Tailored Prompt (Customizable)
                          </label>
                          <span className="text-[10px] text-indigo-300 font-mono">
                            Strict negative parameters appended automatically
                          </span>
                        </div>
                        <textarea
                          id="prompt-input"
                          rows={4}
                          value={activeMediumObj.targetPrompt}
                          onChange={(e) => updatePromptText(activeMediumObj.id, e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono leading-relaxed"
                          placeholder="Visual description of the medium backdrop, environment and consistency markers."
                        />
                      </div>

                      {/* Generate / Imagine action button */}
                      <div className="flex gap-3">
                        <button
                          onClick={() => generateShot(activeMediumObj.id)}
                          disabled={activeMediumObj.isGenerating}
                          className="flex-1 h-11 bg-teal-500 hover:bg-teal-400 active:bg-teal-600 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {activeMediumObj.isGenerating ? (
                            <>
                              <RefreshCw className="w-4 h-4 animate-spin" />
                              Visualizing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 text-slate-950" />
                              Render Shot with Nano-Banana
                            </>
                          )}
                        </button>
                      </div>

                      <div className="bg-slate-900/30 rounded-xl p-3.5 border border-slate-900 flex items-start gap-2.5 text-[11px] text-slate-400 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <strong>Negative parameters locked:</strong> Strictly excludes people, silhouettes, hand-holding, bystanders, and faces. Emphasizes clean flatlays, studio backdrops, and pristine architectural settings to prevent human photobombs.
                        </div>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Quick instructions / features banner */}
          <div className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block font-display">
                01 / Spec Synced
              </span>
              <p className="text-slate-400 text-slate-350 text-[11px] leading-relaxed">
                Physical materials like brushed metals and ceramic sheen are woven directly into each prompt.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block font-display">
                02 / No Empty Mocks
              </span>
              <p className="text-slate-400 text-slate-350 text-[11px] leading-relaxed">
                Each advertising scenario is synthesized from scratch using actual Gemini deep visual descriptions.
              </p>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block font-display">
                03 / Fully Editable
              </span>
              <p className="text-slate-400 text-slate-350 text-[11px] leading-relaxed">
                Tweak the generated settings or insert specialized custom mediums dynamically.
              </p>
            </div>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400 font-display">Brand Builder Studio</span>
            <span>&bull;</span>
            <span>Pristine Product Visualizer</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="hover:text-slate-300 transition-colors">No Humans Policy Enforced</span>
            <span>&bull;</span>
            <span className="text-teal-400/80 font-mono">Nano-Banana Engine</span>
          </div>
        </div>
      </footer>

      {/* FULLSCREEN PREVIEW MODAL */}
      {fullscreenImage && (
        <div className="fixed inset-0 bg-slate-950/95 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="absolute top-4 right-4 z-10 flex items-center gap-3">
            <a
              href={fullscreenImage.url}
              download={`brand_builder_hd.png`}
              className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download Full-Res
            </a>
            <button
              onClick={() => setFullscreenImage(null)}
              className="p-2.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-white rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center">
            <img
              src={fullscreenImage.url}
              alt="High-Res brand preview"
              referrerPolicy="no-referrer"
              className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
            <p className="mt-4 text-sm font-semibold text-slate-300 font-display">
              {fullscreenImage.medium} Concept Render
            </p>
          </div>
        </div>
      )}

      {/* IMAGINE CUSTOM MEDIUM MODAL */}
      {showCustomModal && brandSpec && (
        <div className="fixed inset-0 bg-slate-950/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="space-y-1.5">
              <h3 className="text-base font-bold font-display text-slate-200">
                Imagine Custom Medium
              </h3>
              <p className="text-xs text-slate-400">
                Specify a unique advertising medium which will weave into your brand identity.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="custom-med-name" className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">
                  Medium Name Description
                </label>
                <input
                  id="custom-med-name"
                  type="text"
                  value={customMediumName}
                  onChange={(e) => setCustomMediumName(e.target.value)}
                  placeholder="e.g. Minimalist Glossy Magazine Ad, Bus Stop Shelter, Metro Station wall"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3.5 py-2 text-sm text-slate-200 outline-none transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <label htmlFor="custom-med-ratio" className="block text-xs font-semibold text-slate-400 mb-1.5 font-display uppercase tracking-wider">
                  Target Aspect Ratio
                </label>
                <select
                  id="custom-med-ratio"
                  value={customMediumRatio}
                  onChange={(e) => setCustomMediumRatio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl px-3 py-2 text-sm text-slate-200 outline-none transition-all"
                >
                  <option value="1:1">Square (1:1)</option>
                  <option value="16:9">Widescreen Landscape (16:9)</option>
                  <option value="4:3">Standard Landscape (4:3)</option>
                  <option value="3:4">Standard Portrait (3:4)</option>
                  <option value="9:16">Vertical Mobile (9:16)</option>
                </select>
              </div>

              <button
                onClick={handleAddCustomMedium}
                disabled={isAddingCustom || !customMediumName.trim()}
                className="w-full h-11 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAddingCustom ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Integrating with Brand Spec...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-slate-950" />
                    Synthesize tailored medium
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
