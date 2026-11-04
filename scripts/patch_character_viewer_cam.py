import os

FILE_PATH = r"characterverse\src\components\viewer\CharacterViewer.jsx"

with open(FILE_PATH, "r", encoding="utf-8") as f:
    code = f.read()

old_canvas = """export default function CharacterViewer({ characterData, autoRotate, resetTrigger, onReady = null }) {
  const { zoomAction } = useStudio();

  if (!characterData) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#080b14] rounded-xl">
        <p className="text-slate-500 text-sm">No character selected</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ModelErrorBoundary characterId={characterData.id} characterName={characterData.name}>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            shadows={{ type: THREE.PCFSoftShadowMap }}
            camera={{ position: [0, 0.75, 4.2], fov: 42 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            }}
            style={{ background: 'transparent' }}
          >"""

new_canvas = """export default function CharacterViewer({ characterData, autoRotate, resetTrigger, onReady = null }) {
  const { zoomAction } = useStudio();

  const viewParam = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('view') : null;
  const initialCamPos = useMemo(() => {
    if (viewParam === 'side') return [4.2, 0.35, 0];
    if (viewParam === 'rear') return [2.4, 0.75, -3.8];
    if (viewParam === 'threequarter') return [1.8, 0.70, 3.6];
    return [0, 0.65, 4.2];
  }, [viewParam]);

  if (!characterData) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[#080b14] rounded-xl">
        <p className="text-slate-500 text-sm">No character selected</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <ModelErrorBoundary characterId={characterData.id} characterName={characterData.name}>
        <Suspense fallback={<CanvasLoader />}>
          <Canvas
            shadows={{ type: THREE.PCFSoftShadowMap }}
            camera={{ position: initialCamPos, fov: 40 }}
            gl={{
              antialias: true,
              alpha: true,
              powerPreference: 'high-performance',
            }}
            style={{ background: 'transparent' }}
          >"""

if "\r\n" in code:
    old_canvas = old_canvas.replace("\n", "\r\n")
    new_canvas = new_canvas.replace("\n", "\r\n")

if old_canvas in code:
    code = code.replace(old_canvas, new_canvas)
    print("Canvas initial camera position updated successfully!")
else:
    print("Warning: old_canvas not matched!")

with open(FILE_PATH, "w", encoding="utf-8") as f:
    f.write(code)
