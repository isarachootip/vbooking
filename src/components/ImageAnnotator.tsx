import { useRef, useState } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import type { ReactSketchCanvasRef } from 'react-sketch-canvas';
import { X, Save, Undo, Redo, Trash2, PenTool, Eraser } from 'lucide-react';

interface ImageAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedImageUrl: string) => void;
  onCancel: () => void;
}

export function ImageAnnotator({ imageUrl, onSave, onCancel }: ImageAnnotatorProps) {
  const canvasRef = useRef<ReactSketchCanvasRef>(null);
  const [strokeColor, setStrokeColor] = useState('#ef4444'); // Default red
  const [isEraser, setIsEraser] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);

  const handleSave = async () => {
    if (!canvasRef.current) return;
    try {
      // Export as base64 PNG
      const base64 = await canvasRef.current.exportImage("png");
      onSave(base64);
    } catch (error) {
      console.error("Failed to save annotation", error);
      alert("Failed to save annotated image.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800">Edit Image</h3>
          <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-4 p-3 bg-gray-50 border-b">
          <div className="flex items-center gap-2 border-r pr-4">
            <button
              onClick={() => {
                setIsEraser(false);
                canvasRef.current?.eraseMode(false);
              }}
              className={`p-2 rounded ${!isEraser ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="Pen Tool"
            >
              <PenTool className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setIsEraser(true);
                canvasRef.current?.eraseMode(true);
              }}
              className={`p-2 rounded ${isEraser ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-200'}`}
              title="Eraser Tool"
            >
              <Eraser className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 border-r pr-4">
            <label className="text-sm text-gray-600">Color:</label>
            <input 
              type="color" 
              value={strokeColor} 
              onChange={(e) => setStrokeColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
              disabled={isEraser}
            />
          </div>
          
          <div className="flex items-center gap-2 border-r pr-4">
            <label className="text-sm text-gray-600">Size:</label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={strokeWidth} 
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-24"
            />
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => canvasRef.current?.undo()} className="p-2 text-gray-600 hover:bg-gray-200 rounded" title="Undo">
              <Undo className="w-4 h-4" />
            </button>
            <button onClick={() => canvasRef.current?.redo()} className="p-2 text-gray-600 hover:bg-gray-200 rounded" title="Redo">
              <Redo className="w-4 h-4" />
            </button>
            <button onClick={() => canvasRef.current?.clearCanvas()} className="p-2 text-red-600 hover:bg-red-50 rounded" title="Clear All">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 bg-gray-100 relative overflow-hidden flex justify-center items-center p-4">
          <div className="w-full h-full max-w-full max-h-full flex justify-center items-center" style={{ aspectRatio: '16/9' }}>
            <ReactSketchCanvas
              ref={canvasRef}
              strokeWidth={strokeWidth}
              eraserWidth={strokeWidth * 2}
              strokeColor={strokeColor}
              backgroundImage={imageUrl}
              exportWithBackgroundImage={true}
              preserveBackgroundImageAspectRatio="contain"
              className="border border-gray-300 shadow-sm"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            <Save className="w-4 h-4" />
            Save Image
          </button>
        </div>
      </div>
    </div>
  );
}
