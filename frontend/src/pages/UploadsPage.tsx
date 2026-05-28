import { useState } from 'react';
import { Link } from 'react-router-dom';
import { mockBatches, mockProductVersions, mockStoreRouteVersions } from '../api/mock';
import { Badge, Button, Card, Input, Select } from '../components/common';
import { DataTable, type DataTableColumn } from '../components/data';
import { BatchStatusBadge, FileUploadDropzone } from '../components/domain';
import type { SheetResult } from '../types/batch';
import type { MasterVersion } from '../types/master';

type UploadPhase = 'idle' | 'selected' | 'parsed' | 'validated';

const phaseSteps: Array<{ key: UploadPhase; label: string; description: string }> = [
  { key: 'idle', label: '파일 선택', description: 'OIS 엑셀 선택' },
  { key: 'selected', label: '업로드 준비', description: '고객사/배송일 확인' },
  { key: 'parsed', label: '시트 인식', description: '검증 실행 전' },
  { key: 'validated', label: '검증 완료', description: '결과 확인' },
];

const statusTone: Record<SheetResult['status'], 'green' | 'amber' | 'red'> = {
  NORMAL: 'green',
  WARNING: 'amber',
  ERROR: 'red',
};

const statusLabel: Record<SheetResult['status'], string> = {
  NORMAL: '정상',
  WARNING: 'Warning',
  ERROR: 'Error',
};

export function UploadsPage() {
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [phase, setPhase] = useState<UploadPhase>('idle');
  const sheetResults = phase === 'idle' || phase === 'selected' ? [] : mockBatches[0]?.sheetResults ?? [];
  const validationFinished = phase === 'validated';

  const columns: DataTableColumn<SheetResult>[] = [
    {
      key: 'sheetName',
      header: '시트명',
      width: '190px',
      cell: (item) => <span className="font-mono text-slate-900">{item.sheetName}</span>,
    },
    { key: 'sheetType', header: '시트유형', cell: (item) => sheetTypeLabel(item) },
    { key: 'suffix', header: 'Suffix', cell: (item) => item.suffix ?? '-' },
    { key: 'rowCount', header: '데이터 행 수', align: 'right', cell: (item) => item.rowCount.toLocaleString() },
    {
      key: 'parseStatus',
      header: '파싱 상태',
      cell: (item) => (
        <Badge tone={item.rowCount === 0 && item.sheetName.startsWith('Scan_upload_') ? 'blue' : 'green'}>
          {item.rowCount === 0 && item.sheetName.startsWith('Scan_upload_') ? '0건 정상' : '인식 완료'}
        </Badge>
      ),
    },
    {
      key: 'validationStatus',
      header: '검증 상태',
      cell: (item) =>
        validationFinished ? <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge> : <Badge>검증 대기</Badge>,
    },
    {
      key: 'severityCount',
      header: 'E / W',
      align: 'right',
      cell: (item) => (validationFinished ? `${item.errorCount} / ${item.warningCount}` : '-'),
    },
    { key: 'message', header: '메시지', width: '300px', cell: (item) => item.message },
  ];

  function handleFileSelect(file: File) {
    setSelectedFileName(file.name);
    setPhase('selected');
  }

  function handleFileRemove() {
    setSelectedFileName('');
    setPhase('idle');
  }

  function handleStartUpload() {
    setPhase('parsed');
  }

  function handleValidate() {
    setPhase('validated');
  }

  return (
    <div className="space-y-5">
      <UploadProgress phase={phase} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(360px,0.65fr)]">
        <div className="space-y-5">
          <FileUploadDropzone
            accept=".xlsm,.xlsx"
            acceptLabel="XLSM, XLSX"
            description="OIS에서 생성한 발주 엑셀 파일을 선택하세요. 매크로는 실행하지 않고 시트와 셀 값만 읽습니다."
            onFileRemove={selectedFileName ? handleFileRemove : undefined}
            onFileSelect={handleFileSelect}
            selectedFileName={selectedFileName}
            title="OIS 엑셀 파일을 선택하거나 여기에 드롭"
          />

          <Card className="p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <Input label="배송일" type="date" value="2025-12-15" readOnly />
              <Select label="고객사" options={[{ label: '웰스토리', value: 'wellstory' }]} />
            </div>
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">{actionTitle(phase)}</p>
                <p className="mt-1 text-sm text-slate-500">{actionDescription(phase)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {phase === 'parsed' ? (
                  <Button onClick={handleValidate} variant="primary">
                    검증 실행
                  </Button>
                ) : null}
                {phase === 'validated' ? (
                  <>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                      to="/batches/BATCH-20260528-001"
                    >
                      배치 상세
                    </Link>
                    <Link
                      className="inline-flex h-10 items-center justify-center rounded-md border border-teal-700 bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                      to="/batches/BATCH-20260528-001/validation"
                    >
                      검증 결과
                    </Link>
                  </>
                ) : (
                  <Button disabled={!selectedFileName || phase !== 'selected'} onClick={handleStartUpload} variant="primary">
                    업로드 시작
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {phase === 'idle' || phase === 'selected' ? (
            <Card className="p-6">
              <p className="text-sm font-semibold text-slate-900">시트 인식 결과</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                파일 업로드가 완료되면 `Scan_upload_*`, `PL_EA`, `PL_Box`, `Label_EA`, `Label_Box` 시트가 이곳에 표시됩니다.
                `Scan_upload_군량리`처럼 데이터 행이 0건인 시트도 정상 케이스로 표시됩니다.
              </p>
            </Card>
          ) : (
            <DataTable columns={columns} data={sheetResults} getRowKey={(item) => item.sheetName} />
          )}
        </div>

        <aside className="space-y-5">
          <CurrentMasterCriteriaPanel productMaster={mockProductVersions[0]} storeRouteMaster={mockStoreRouteVersions[0]} />
          <UploadRulesPanel />
          <RecentUploadsPanel />
        </aside>
      </div>
    </div>
  );
}

function UploadProgress({ phase }: { phase: UploadPhase }) {
  const currentIndex = phaseSteps.findIndex((step) => step.key === phase);

  return (
    <Card className="p-4">
      <div className="grid gap-3 md:grid-cols-4">
        {phaseSteps.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;

          return (
            <div
              className={`rounded-md border px-4 py-3 ${
                active
                  ? 'border-teal-300 bg-teal-50'
                  : done
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-slate-200 bg-slate-50'
              }`}
              key={step.key}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    active || done ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {done ? '✓' : index + 1}
                </span>
                <span className="text-sm font-semibold text-slate-950">{step.label}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{step.description}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CurrentMasterCriteriaPanel({
  productMaster,
  storeRouteMaster,
}: {
  productMaster: MasterVersion;
  storeRouteMaster: MasterVersion;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-bold text-slate-950">현재 검증 기준 마스터</p>
          <p className="mt-1 text-sm leading-6 text-slate-500">버전 선택 없이 tenant별 현재 마스터 기준으로 검증합니다.</p>
        </div>
        <Badge tone="green">검증 가능</Badge>
      </div>
      <div className="mt-5 space-y-3">
        <MasterCriteriaRow label="상품 마스터" rowCount={productMaster.rowCount} uploadedAt={productMaster.uploadedAt} />
        <MasterCriteriaRow label="배송지/차량 마스터" rowCount={storeRouteMaster.rowCount} uploadedAt={storeRouteMaster.uploadedAt} />
      </div>
      <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
        검증 실행 시점은 배치에 `productMasterCheckedAt`, `storeRouteMasterCheckedAt`으로 기록됩니다.
      </div>
    </Card>
  );
}

function MasterCriteriaRow({ label, rowCount, uploadedAt }: { label: string; rowCount: number; uploadedAt: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <Badge tone="blue">{rowCount.toLocaleString()}건</Badge>
      </div>
      <p className="mt-1 text-xs text-slate-500">마지막 업로드: {uploadedAt}</p>
    </div>
  );
}

function UploadRulesPanel() {
  return (
    <Card className="p-5">
      <p className="text-base font-bold text-slate-950">업로드 규칙</p>
      <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-600">
        <li>`Scan_upload_*`는 정식 입력 시트입니다.</li>
        <li>0건 Scan 시트는 실패가 아니라 정상 케이스입니다.</li>
        <li>검증 대기 상태에서는 배치를 확정할 수 없습니다.</li>
        <li>Error가 1건 이상이면 확정 버튼은 비활성화됩니다.</li>
      </ul>
    </Card>
  );
}

function RecentUploadsPanel() {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-bold text-slate-950">최근 업로드</p>
        <Link className="text-sm font-semibold text-teal-700 hover:text-teal-800" to="/batches">
          전체 보기
        </Link>
      </div>
      <div className="mt-4 space-y-3">
        {mockBatches.slice(0, 3).map((batch) => (
          <div className="rounded-md border border-slate-200 px-3 py-3" key={batch.id}>
            <div className="flex items-center justify-between gap-3">
              <Link className="font-mono text-sm font-semibold text-slate-950 hover:text-teal-700" to={`/batches/${batch.id}`}>
                {batch.id}
              </Link>
              <BatchStatusBadge status={batch.status} />
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{batch.fileName}</p>
            <p className="mt-1 text-xs text-slate-500">{batch.uploadedAt}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function sheetTypeLabel(item: SheetResult) {
  if (item.sheetType === 'SCAN') {
    return 'Scan';
  }

  if (item.sheetType === 'PL_EA') {
    return 'PL EA';
  }

  if (item.sheetType === 'PL_BOX') {
    return 'PL Box';
  }

  if (item.sheetType === 'LABEL_EA') {
    return 'Label EA';
  }

  return 'Label Box';
}

function actionTitle(phase: UploadPhase) {
  if (phase === 'idle') {
    return '파일을 선택하세요';
  }

  if (phase === 'selected') {
    return '업로드를 시작할 수 있습니다';
  }

  if (phase === 'parsed') {
    return '시트 인식 완료, 검증 대기';
  }

  return '검증이 완료되었습니다';
}

function actionDescription(phase: UploadPhase) {
  if (phase === 'idle') {
    return '고객사와 배송일을 확인한 뒤 OIS 엑셀 파일을 선택하세요.';
  }

  if (phase === 'selected') {
    return '아직 업로드 전이므로 시트 인식 결과와 배치 확정 액션은 표시하지 않습니다.';
  }

  if (phase === 'parsed') {
    return '인식된 시트를 확인한 뒤 현재 마스터 기준으로 검증을 실행하세요.';
  }

  return 'Error가 있으면 배치 확정은 배치 상세에서 비활성화됩니다. 검증 결과를 먼저 확인하세요.';
}
