interface FileUploadDropzoneProps {
  title?: string;
  description?: string;
  acceptLabel?: string;
}

export function FileUploadDropzone({
  acceptLabel = 'XLSM, XLSX, CSV',
  description = '이번 단계에서는 실제 파일 업로드를 실행하지 않습니다.',
  title = '파일을 선택하거나 여기에 드롭',
}: FileUploadDropzoneProps) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-6 py-8 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-teal-50 text-sm font-bold text-teal-700">UP</div>
      <p className="mt-4 text-sm font-semibold text-slate-900">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      <p className="mt-3 text-xs font-semibold text-slate-500">허용 형식: {acceptLabel}</p>
      <input aria-label="file-upload-skeleton" className="sr-only" disabled type="file" />
    </div>
  );
}
