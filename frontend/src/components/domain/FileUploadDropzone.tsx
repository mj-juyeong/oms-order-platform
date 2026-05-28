import type { ChangeEvent } from 'react';

interface FileUploadDropzoneProps {
  title?: string;
  description?: string;
  acceptLabel?: string;
  accept?: string;
  disabled?: boolean;
  selectedFileName?: string;
  onFileSelect?: (file: File) => void;
  onFileRemove?: () => void;
}

export function FileUploadDropzone({
  accept = '.xlsm,.xlsx',
  acceptLabel = 'XLSM, XLSX, CSV',
  disabled = false,
  description = '이번 단계에서는 실제 파일 업로드를 실행하지 않습니다.',
  onFileRemove,
  onFileSelect,
  selectedFileName,
  title = '파일을 선택하거나 여기에 드롭',
}: FileUploadDropzoneProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      onFileSelect?.(file);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
      <label
        className={`flex min-h-40 flex-col items-center justify-center rounded-md transition ${
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-slate-50'
        }`}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-teal-50 text-sm font-bold text-teal-700">
          XLS
        </div>
        <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">{description}</p>
        <p className="mt-3 text-xs font-semibold text-slate-500">허용 형식: {acceptLabel}</p>
        <input
          accept={accept}
          aria-label="OIS 엑셀 파일 선택"
          className="sr-only"
          disabled={disabled}
          onChange={handleChange}
          type="file"
        />
      </label>
      {selectedFileName ? (
        <div className="mt-5 flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">선택된 파일</p>
            <p className="mt-1 break-all font-mono text-sm font-semibold text-slate-950">{selectedFileName}</p>
          </div>
          {onFileRemove ? (
            <button
              className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              onClick={onFileRemove}
              type="button"
            >
              파일 제거
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
