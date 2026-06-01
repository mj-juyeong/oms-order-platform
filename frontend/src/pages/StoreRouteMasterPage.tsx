import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { canManageMasters, fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, FullScreenLoadingOverlay, Input, Modal, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell, FileUploadDropzone, MasterUploadReviewPanel } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { MasterUploadPreviewResult, MasterUploadStatus, StoreRouteMasterItem, StoreRouteMasterUploadHistory, StoreRouteMasterUploadResult } from '../types/master';

type StoreRouteOperationStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface StoreRouteFilters {
  baljugoCode: string;
  storeCode: string;
  brandName: string;
  storeName: string;
  area: string;
  deliveryRound: string;
  vehicleName: string;
  operationStatus: StoreRouteOperationStatus;
}

const initialFilters: StoreRouteFilters = {
  baljugoCode: '',
  storeCode: '',
  brandName: '',
  storeName: '',
  area: '',
  deliveryRound: '',
  vehicleName: '',
  operationStatus: 'ALL',
};

const pageSize = 50;
const configuredMaxMasterUploadMb = Number(import.meta.env.VITE_MAX_MASTER_UPLOAD_MB ?? 200);
const maxMasterUploadMb = Number.isFinite(configuredMaxMasterUploadMb) && configuredMaxMasterUploadMb > 0 ? configuredMaxMasterUploadMb : 200;
const maxMasterUploadBytes = maxMasterUploadMb * 1024 * 1024;
const maxMasterUploadLabel = `${maxMasterUploadMb}MB`;

const storeRouteColumns: DataTableColumn<StoreRouteMasterItem>[] = [
  { key: 'baljugoCode', header: '발주고코드', width: '150px', cell: (item) => <CodeCell value={item.baljugoCode} /> },
  { key: 'customerCode', header: '거래처코드', width: '130px', cell: (item) => <CodeCell value={item.customerCode ?? item.storeCode ?? ''} /> },
  { key: 'brand', header: '브랜드명', width: '140px', cell: (item) => item.brandName ?? '-' },
  {
    key: 'store',
    header: '지점명',
    width: '150px',
    cell: (item) => <span className="font-semibold text-slate-900">{item.storeName ?? '-'}</span>,
  },
  { key: 'area', header: '권역', width: '120px', cell: (item) => item.area ?? '-' },
  { key: 'round', header: '차수', width: '80px', cell: (item) => item.deliveryRound ?? '-' },
  { key: 'vehicle', header: '차량명', width: '130px', cell: (item) => item.vehicleName ?? '-' },
  { key: 'driver', header: '담당기사', width: '110px', cell: (item) => item.driverName ?? '-' },
  { key: 'status', header: '운영여부', cell: (item) => <OperationStatusBadge item={item} /> },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo ?? '-' },
];

const uploadHistoryColumns: DataTableColumn<StoreRouteMasterUploadHistory>[] = [
  { key: 'uploadedAt', header: '업로드시각', width: '170px', cell: (item) => formatDateTime(item.uploadedAt) },
  { key: 'fileName', header: '파일명', width: '240px', cell: (item) => <span className="font-mono text-slate-800">{item.fileName ?? '-'}</span> },
  { key: 'status', header: '상태', cell: (item) => <UploadStatusBadge status={item.status} /> },
  { key: 'rowCount', header: '전체', align: 'right', cell: (item) => item.rowCount.toLocaleString() },
  { key: 'inserted', header: '신규', align: 'right', cell: (item) => item.insertedCount.toLocaleString() },
  { key: 'updated', header: '수정', align: 'right', cell: (item) => item.updatedCount.toLocaleString() },
  { key: 'unchanged', header: '유지', align: 'right', cell: (item) => item.unchangedCount.toLocaleString() },
  { key: 'failed', header: '실패', align: 'right', cell: (item) => item.failedCount.toLocaleString() },
  { key: 'message', header: '메시지', width: '280px', cell: (item) => item.message ?? '-' },
];

export function StoreRouteMasterPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const [searchParams] = useSearchParams();
  const requestedBaljugoCode = searchParams.get('baljugoCode') ?? '';
  const [filters, setFilters] = useState<StoreRouteFilters>(() => ({ ...initialFilters, baljugoCode: requestedBaljugoCode }));
  const [filtersOpen, setFiltersOpen] = useState(Boolean(requestedBaljugoCode));
  const [page, setPage] = useState(0);
  const [storeRouteResponse, setStoreRouteResponse] = useState<PageResponse<StoreRouteMasterItem> | null>(null);
  const [uploadHistoryResponse, setUploadHistoryResponse] = useState<PageResponse<StoreRouteMasterUploadHistory> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadPreview, setUploadPreview] = useState<MasterUploadPreviewResult | null>(null);
  const [uploadResult, setUploadResult] = useState<StoreRouteMasterUploadResult | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [loadingStoreRoutes, setLoadingStoreRoutes] = useState(true);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const canUploadMaster = canManageMasters();

  useEffect(() => {
    if (!requestedBaljugoCode) return;

    setFilters((current) => (current.baljugoCode === requestedBaljugoCode ? current : { ...current, baljugoCode: requestedBaljugoCode }));
    setFiltersOpen(true);
    setPage(0);
  }, [requestedBaljugoCode]);

  useEffect(() => {
    let ignore = false;

    async function loadStoreRoutes() {
      setLoadingStoreRoutes(true);
      setErrorMessage(null);
      try {
        if (!tenantId) {
          setStoreRouteResponse({ items: [], page, size: pageSize, totalElements: 0, totalPages: 0 });
          return;
        }
        const result = await omsApi.masters.storeRoutes.list({
          tenantId,
          baljugoCode: filters.baljugoCode.trim() || undefined,
          storeCode: filters.storeCode.trim() || undefined,
          brandName: filters.brandName.trim() || undefined,
          storeName: filters.storeName.trim() || undefined,
          area: filters.area.trim() || undefined,
          deliveryRound: filters.deliveryRound.trim() || undefined,
          vehicleName: filters.vehicleName.trim() || undefined,
          operationStatus: filters.operationStatus === 'ALL' ? undefined : filters.operationStatus,
          page,
          size: pageSize,
        });
        if (!ignore) {
          setStoreRouteResponse(result);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) {
          setLoadingStoreRoutes(false);
        }
      }
    }

    loadStoreRoutes();
    return () => {
      ignore = true;
    };
  }, [
    filters.area,
    filters.baljugoCode,
    filters.brandName,
    filters.deliveryRound,
    filters.operationStatus,
    filters.storeCode,
    filters.storeName,
    filters.vehicleName,
    page,
    reloadSeq,
    tenantId,
  ]);

  useEffect(() => {
    let ignore = false;

    async function loadUploads() {
      setLoadingUploads(true);
      try {
        if (!tenantId) {
          setUploadHistoryResponse({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
          return;
        }
        const result = await omsApi.masters.storeRoutes.uploads({ tenantId, page: 0, size: 20 });
        if (!ignore) {
          setUploadHistoryResponse(result);
        }
      } catch {
        if (!ignore) {
          setUploadHistoryResponse(null);
        }
      } finally {
        if (!ignore) {
          setLoadingUploads(false);
        }
      }
    }

    loadUploads();
    return () => {
      ignore = true;
    };
  }, [reloadSeq, tenantId]);

  const activeFilterCount = useMemo(() => countActiveStoreRouteFilters(filters), [filters]);
  const storeRoutes = storeRouteResponse?.items ?? [];
  const latestUpload = uploadResult ?? uploadHistoryResponse?.items[0] ?? null;

  function openUploadModal() {
    if (!canUploadMaster || !tenantId) return;

    setSelectedFile(null);
    setUploadError('');
    setUploadPreview(null);
    setUploadResult(null);
    setIsUploadModalOpen(true);
  }

  function handleFileSelect(file: File) {
    if (!canUploadMaster || !tenantId) return;

    setUploadResult(null);
    setUploadPreview(null);

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      setSelectedFile(null);
      setUploadError('배송지/차량 마스터는 XLSX 파일만 업로드할 수 있습니다.');
      return;
    }

    if (file.size > maxMasterUploadBytes) {
      setSelectedFile(null);
      setUploadError(`업로드 파일은 ${maxMasterUploadLabel} 이하만 선택할 수 있습니다.`);
      return;
    }

    setSelectedFile(file);
    setUploadError('');
  }

  async function handleUpload() {
    if (!canUploadMaster || !tenantId) return;

    if (!selectedFile) {
      setUploadError('업로드할 XLSX 파일을 먼저 선택해 주세요.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const preview = await omsApi.masters.storeRoutes.previewXlsx({
        tenantId,
        file: selectedFile,
        uploadedBy: fakeCurrentUser.id ?? undefined,
      });

      const previewWithMeta = {
        ...preview,
        fileName: selectedFile.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: fakeCurrentUser.name,
      };

      if (preview.failedCount > 0) {
        setUploadPreview(previewWithMeta);
        setReloadSeq((current) => current + 1);
        return;
      }

      const result = await omsApi.masters.storeRoutes.applyUpload({
        tenantId,
        uploadId: preview.uploadId,
      });
      setUploadResult({
        ...result,
        fileName: selectedFile.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: fakeCurrentUser.name,
      });
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setUploadError(formatApiError(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleApplyPreview() {
    if (!canUploadMaster || !tenantId) return;

    if (!uploadPreview) {
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const result = await omsApi.masters.storeRoutes.applyUpload({
        tenantId,
        uploadId: uploadPreview.uploadId,
      });
      setUploadResult({
        ...result,
        fileName: uploadPreview.fileName,
        uploadedAt: new Date().toISOString(),
        uploadedBy: fakeCurrentUser.name,
      });
      setUploadPreview(null);
      setSelectedFile(null);
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setUploadError(formatApiError(error));
    } finally {
      setUploading(false);
    }
  }

  async function handleCancelPreview() {
    if (!canUploadMaster || !tenantId) return;

    if (!uploadPreview) {
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      await omsApi.masters.storeRoutes.cancelUpload({
        tenantId,
        uploadId: uploadPreview.uploadId,
      });
      setUploadPreview(null);
      setSelectedFile(null);
      setIsUploadModalOpen(false);
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setUploadError(formatApiError(error));
    } finally {
      setUploading(false);
    }
  }

  function updateFilter<TKey extends keyof StoreRouteFilters>(key: TKey, value: StoreRouteFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(0);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setPage(0);
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-4">
        <MasterMetric title="현재 배송지" value={`${(storeRouteResponse?.totalElements ?? 0).toLocaleString()}건`} description="조회 가능한 배송지/차량 기준정보" />
        <MasterMetric title="최근 업로드" value={latestUpload ? formatDateTime(latestUpload.uploadedAt) : '-'} description={latestUpload?.fileName ?? '업로드 이력 없음'} />
        <MasterMetric title="최근 반영 결과" value={latestUpload ? `${latestUpload.rowCount.toLocaleString()}건` : '-'} description={formatUploadCounts(latestUpload)} />
        <MasterMetric title="관리 항목" value="배송 운영정보" description="배송지, 권역, 차수, 차량명" />
      </section>

      <StoreRouteFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        open={filtersOpen}
        updateFilter={updateFilter}
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">현재 배송지/차량 마스터</h2>
            <p className="text-sm text-slate-500">
              조회 결과 {(storeRouteResponse?.totalElements ?? 0).toLocaleString()}건
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsHistoryModalOpen(true)} variant="secondary">
              업로드 이력
            </Button>
            {canUploadMaster ? (
              <Button onClick={openUploadModal} variant="primary">
                XLSX 업로드
              </Button>
            ) : null}
          </div>
        </div>

        {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
        {loadingStoreRoutes ? (
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-900">배송지/차량 마스터를 조회하는 중입니다.</p>
            <p className="mt-2 text-sm text-slate-500">배송지와 차량 기준정보를 불러오고 있습니다.</p>
          </Card>
        ) : (
          <>
            <DataTable
              columns={storeRouteColumns}
              data={storeRoutes}
              emptyDescription="발주고코드, 지점명, 차량명, 운영여부 필터를 다시 확인해 주세요."
              emptyTitle="조회 결과가 없습니다."
              getRowKey={(item) => String(item.id)}
            />
            <Pagination
              page={page + 1}
              total={storeRouteResponse?.totalElements ?? 0}
              totalPages={Math.max(storeRouteResponse?.totalPages ?? 0, 1)}
              onPageChange={(nextPage) => setPage(nextPage - 1)}
            />
          </>
        )}
      </section>

      {uploading ? (
        <FullScreenLoadingOverlay
          description={uploadPreview ? '선택한 정상행을 현재 배송지/차량 마스터에 반영하는 중입니다.' : '배송지와 차량 기준정보를 검사하고 현재 마스터 반영 여부를 확인하는 중입니다.'}
          detail={selectedFile?.name}
          title={uploadPreview ? '배송지/차량 마스터를 반영하고 있습니다' : '배송지/차량 마스터를 검사하고 있습니다'}
        />
      ) : null}

      {canUploadMaster ? (
        <Modal open={isUploadModalOpen} title="배송지/차량 마스터 XLSX 업로드" onClose={() => setIsUploadModalOpen(false)}>
          {uploadPreview ? (
            <MasterUploadReviewPanel
              loading={uploading}
              masterLabel="배송지/차량 마스터"
              onCancel={handleCancelPreview}
              onConfirm={handleApplyPreview}
              preview={uploadPreview}
              target="storeRoute"
            />
          ) : uploadResult ? (
            <MasterUploadCompleteView
              onClose={() => setIsUploadModalOpen(false)}
              onUploadAnother={openUploadModal}
              result={uploadResult}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">선택한 XLSX를 먼저 검사한 뒤 현재 배송지/차량 기준정보 반영 여부를 결정합니다.</p>
                <Badge tone="teal">ADMIN</Badge>
              </div>
              <FileUploadDropzone
                accept=".xlsx"
                acceptLabel="XLSX"
                description="발주고코드, 브랜드명, 지점명, 권역, 차수, 차량명, 기사명 컬럼을 포함한 배송지/차량 마스터 XLSX 파일"
                disabled={uploading}
                onFileRemove={() => {
                  setSelectedFile(null);
                  setUploadError('');
                }}
                onFileSelect={handleFileSelect}
                selectedFileName={selectedFile?.name}
                title="배송지/차량 마스터 XLSX 선택"
              />

              {uploadError ? <ErrorMessage message={uploadError} /> : null}

              <div className="flex justify-end gap-2">
                <Button disabled={uploading} onClick={() => setIsUploadModalOpen(false)} variant="ghost">
                  닫기
                </Button>
                <Button disabled={!selectedFile || uploading} onClick={handleUpload} variant="primary">
                  {uploading ? '검사 중' : '업로드 검사'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      ) : null}

      <Modal open={isHistoryModalOpen} title="배송지/차량 마스터 업로드 이력" size="wide" onClose={() => setIsHistoryModalOpen(false)}>
        {loadingUploads ? (
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-900">업로드 이력을 조회하는 중입니다.</p>
          </Card>
        ) : (
          <DataTable
            columns={uploadHistoryColumns}
            data={uploadHistoryResponse?.items ?? []}
            emptyDescription="아직 배송지/차량 마스터 업로드 이력이 없습니다."
            emptyTitle="업로드 이력이 없습니다."
            getRowKey={(item) => String(item.id ?? item.uploadId)}
          />
        )}
      </Modal>
    </div>
  );
}

function MasterMetric({ description, title, value }: { description: string; title: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-2 truncate text-lg font-bold text-slate-950">{value}</p>
      <p className="mt-1 truncate text-xs text-slate-500">{description}</p>
    </Card>
  );
}

function StoreRouteFilterPanel({
  activeFilterCount,
  filters,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: StoreRouteFilters;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof StoreRouteFilters>(key: TKey, value: StoreRouteFilters[TKey]) => void;
}) {
  return (
    <Card className="px-4 py-4">
      <div
        className="flex cursor-pointer flex-col gap-3 rounded-md lg:flex-row lg:items-center lg:justify-between"
        onClick={onToggleOpen}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">조회 조건</p>
            {activeFilterCount > 0 ? <Badge tone="blue">적용 {activeFilterCount}</Badge> : <Badge>전체 조회</Badge>}
          </div>
          <p className="mt-1 text-xs text-slate-500">발주고코드, 지점, 권역, 차수, 차량과 운영여부로 현재 배송지/차량 기준정보를 찾습니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={activeFilterCount === 0} onClick={onReset} size="sm" variant="ghost">
            초기화
          </Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">
            {open ? '필터 접기' : '상세 필터'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Input label="발주고코드" onChange={(event) => updateFilter('baljugoCode', event.target.value)} placeholder="S001" value={filters.baljugoCode} />
            <Input label="거래처코드" onChange={(event) => updateFilter('storeCode', event.target.value)} placeholder="C001" value={filters.storeCode} />
            <Input label="브랜드명" onChange={(event) => updateFilter('brandName', event.target.value)} placeholder="Brand" value={filters.brandName} />
            <Input label="지점명" onChange={(event) => updateFilter('storeName', event.target.value)} placeholder="강남점" value={filters.storeName} />
            <Input label="권역" onChange={(event) => updateFilter('area', event.target.value)} placeholder="수도권" value={filters.area} />
            <Input label="차수" onChange={(event) => updateFilter('deliveryRound', event.target.value)} placeholder="1" value={filters.deliveryRound} />
            <Input label="차량명" onChange={(event) => updateFilter('vehicleName', event.target.value)} placeholder="11가" value={filters.vehicleName} />
            <Select
              label="운영여부"
              onChange={(event) => updateFilter('operationStatus', event.target.value as StoreRouteOperationStatus)}
              options={[
                { label: '전체', value: 'ALL' },
                { label: '운영', value: 'ACTIVE' },
                { label: '중지', value: 'INACTIVE' },
              ]}
              value={filters.operationStatus}
            />
          </div>
        </div>
      ) : null}
    </Card>
  );
}

function MasterUploadCompleteView({
  onClose,
  onUploadAnother,
  result,
}: {
  onClose: () => void;
  onUploadAnother: () => void;
  result: StoreRouteMasterUploadResult;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-base font-bold text-emerald-900">배송지/차량 마스터 업로드가 완료되었습니다</p>
            <p className="mt-1 text-sm leading-6 text-emerald-800">처리 결과가 현재 배송지/차량 기준정보에 반영되었습니다.</p>
          </div>
          <UploadStatusBadge status={result.status} />
        </div>
      </div>
      <MasterUploadResultSummary result={result} />
      <div className="flex justify-end gap-2">
        <Button onClick={onUploadAnother} variant="secondary">
          다른 파일 업로드
        </Button>
        <Button onClick={onClose} variant="primary">
          완료
        </Button>
      </div>
    </div>
  );
}

function MasterUploadResultSummary({ result }: { result: StoreRouteMasterUploadResult }) {
  return (
    <Card className="p-5 shadow-none">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">처리 요약</p>
          <p className="mt-1 break-all font-mono text-sm text-slate-500">{result.fileName ?? `upload #${result.uploadId}`}</p>
        </div>
        <UploadStatusBadge status={result.status} />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <SummaryCount label="전체" value={result.rowCount} />
        <SummaryCount label="신규" value={result.insertedCount} tone="text-teal-700" />
        <SummaryCount label="수정" value={result.updatedCount} tone="text-blue-700" />
        <SummaryCount label="유지" value={result.unchangedCount} />
        <SummaryCount label="실패" value={result.failedCount} tone={result.failedCount > 0 ? 'text-red-700' : 'text-slate-950'} />
      </div>

      {result.failedCount > 0 ? <StoreRouteUploadFailureNotice failedCount={result.failedCount} /> : null}

      <div className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold text-slate-500">업로드자</dt>
            <dd className="mt-1 font-semibold text-slate-900">{result.uploadedBy ?? '-'}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold text-slate-500">처리시각</dt>
            <dd className="mt-1 font-semibold text-slate-900">{formatDateTime(result.uploadedAt)}</dd>
          </div>
        </dl>
      </div>
    </Card>
  );
}

function StoreRouteUploadFailureNotice({ failedCount }: { failedCount: number }) {
  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-bold text-amber-900">일부 행은 반영되지 않았습니다</p>
      <p className="mt-1 text-sm leading-6 text-amber-800">
        실패 {failedCount.toLocaleString()}건은 발주고코드가 비어 있거나, 같은 파일 안에 이미 같은 발주고코드가 있어 제외된 행입니다.
      </p>
      <p className="mt-2 text-xs leading-5 text-amber-700">
        발주고코드를 채우거나 중복 발주고코드를 하나로 정리한 뒤 다시 업로드하면 전체 반영할 수 있습니다.
      </p>
    </div>
  );
}

function SummaryCount({ label, tone = 'text-slate-950', value }: { label: string; tone?: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-3">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-bold ${tone}`}>{value.toLocaleString()}</p>
    </div>
  );
}

function OperationStatusBadge({ item }: { item: StoreRouteMasterItem }) {
  const active = item.activeYn ?? item.operationStatus === 'ACTIVE';
  return <Badge tone={active ? 'green' : 'neutral'}>{active ? '운영' : '중지'}</Badge>;
}

function UploadStatusBadge({ status }: { status: MasterUploadStatus }) {
  const statusMap: Record<MasterUploadStatus, { label: string; tone: 'green' | 'amber' | 'red' | 'blue' | 'neutral' }> = {
    UPLOADED: { label: '업로드됨', tone: 'blue' },
    PROCESSING: { label: '처리 중', tone: 'blue' },
    READY_TO_APPLY: { label: '반영 대기', tone: 'blue' },
    REVIEW_REQUIRED: { label: '확인 필요', tone: 'amber' },
    APPLIED: { label: '적용 완료', tone: 'green' },
    SUCCESS: { label: '성공', tone: 'green' },
    PARTIAL_FAILED: { label: '부분 실패', tone: 'amber' },
    FAILED: { label: '실패', tone: 'red' },
    CANCELLED: { label: '취소', tone: 'neutral' },
  };
  const statusInfo = statusMap[status] ?? { label: status, tone: 'neutral' as const };

  return <Badge tone={statusInfo.tone}>{statusInfo.label}</Badge>;
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

function countActiveStoreRouteFilters(filters: StoreRouteFilters) {
  return [
    filters.baljugoCode.trim(),
    filters.storeCode.trim(),
    filters.brandName.trim(),
    filters.storeName.trim(),
    filters.area.trim(),
    filters.deliveryRound.trim(),
    filters.vehicleName.trim(),
    filters.operationStatus !== 'ALL' ? filters.operationStatus : '',
  ].filter(Boolean).length;
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError) {
    const code = error.response.error?.code;
    return code ? `${code}: ${error.message}` : error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return '요청 처리 중 오류가 발생했습니다.';
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function formatUploadCounts(upload: StoreRouteMasterUploadResult | StoreRouteMasterUploadHistory | null) {
  if (!upload) {
    return '아직 반영된 파일 없음';
  }

  return `신규 ${upload.insertedCount.toLocaleString()}건, 수정 ${upload.updatedCount.toLocaleString()}건, 실패 ${upload.failedCount.toLocaleString()}건`;
}
