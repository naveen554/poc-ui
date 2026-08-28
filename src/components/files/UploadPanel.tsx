import { useRef, useState } from 'react';
import { UploadCloudIcon, AlertCircleIcon } from 'lucide-react';
import { Panel } from '../ui/Panel';

export function UploadPanel({ onFilesSelected }: {onFilesSelected: (files: File[]) => void;}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const all = Array.from(files);
    const pdfs = all.filter((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
    const rejected = all.length - pdfs.length;
    setError(rejected > 0 ? `Only PDF files are supported. ${rejected} file${rejected > 1 ? 's were' : ' was'} skipped.` : null);
    if (pdfs.length === 0) return;
    onFilesSelected(pdfs);
  };

  return (
    <Panel title="Upload Contract" bodyClassName="p-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={[
        'flex flex-col items-center justify-center rounded border-2 border-dashed px-4 py-6 transition-colors duration-150 ease-out',
        dragging ? 'border-navy-700 bg-navy-50' : 'border-gray-300 bg-white'].
        join(' ')}>
        
        <UploadCloudIcon className="h-6 w-6 text-navy-600" aria-hidden="true" />
        <p className="mt-2 text-[13px] text-gray-700">
          Drag &amp; drop files here or <span className="font-semibold text-navy-700">browse</span>
        </p>
        <p className="mt-1 text-[11px] text-gray-400">Supports PDF only (Max 20MB)</p>
        {error &&
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-red-600">
            <AlertCircleIcon className="h-3 w-3 shrink-0" />
            {error}
          </p>
        }
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 rounded bg-navy-700 px-3 py-1.5 text-[12px] font-semibold text-white transition-colors duration-150 ease-out hover:bg-navy-800">
          
          Browse Files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
        
      </div>
    </Panel>);

}