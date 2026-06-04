import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { canManageMasters, fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, FullScreenLoadingOverlay, Input, Modal, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell, FileUploadDropzone, MasterUploadReviewPanel, ProductMasterDetailModal } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { MasterUploadPreviewResult, MasterUploadStatus, ProductMasterDetail, ProductMasterItem, ProductMasterUploadHistory, ProductMasterUploadResult } from '../types/master';
import { areFilterStatesEqual } from '../utils/filterState';

type ProductOperationStatus = 'ALL' | 'ACTIVE' | 'INACTIVE';

interface ProductFilters {
  ezadminCode: string;
  productName: string;
  operationStatus: ProductOperationStatus;
  storageTemperature: string;
}

const initialFilters: ProductFilters = {
  ezadminCode: '',
  productName: '',
  operationStatus: 'ALL',
  storageTemperature: '',
};

const pageSize = 50;
const configuredMaxMasterUploadMb = Number(import.meta.env.VITE_MAX_MASTER_UPLOAD_MB ?? 200);
const maxMasterUploadMb = Number.isFinite(configuredMaxMasterUploadMb) && configuredMaxMasterUploadMb > 0 ? configuredMaxMasterUploadMb : 200;
const maxMasterUploadBytes = maxMasterUploadMb * 1024 * 1024;
const maxMasterUploadLabel = `${maxMasterUploadMb}MB`;

const productColumns: DataTableColumn<ProductMasterItem>[] = [
  {
    key: 'productName',
    header: '상품명',
    width: '320px',
    cell: (item) => <span className="font-semibold text-slate-900">{item.productName ?? '-'}</span>,
  },
  { key: 'ezadminCode', header: '상품코드', width: '110px', cell: (item) => <CodeCell value={item.ezadminCode} /> },
  {
    key: 'customerProductCode',
    header: '거래처 상품코드',
    width: '160px',
    cell: (item) => <CodeCell value={item.customerProductCode ?? item.clientProductCode ?? ''} />,
  },
  { key: 'boxQty', header: '박스입수량', align: 'right', cell: (item) => formatNumber(item.boxQty, 3) },
  { key: 'unit', header: '출고단위', cell: (item) => item.outboundUnit ?? '-' },
  { key: 'temp', header: '보관온도', cell: (item) => item.temperatureType ?? item.storageTemperature ?? '-' },
  { key: 'cbm', header: 'CBM', align: 'right', cell: (item) => formatNumber(item.cbm, 6) },
  { key: 'status', header: '운영여부', cell: (item) => <OperationStatusBadge item={item} /> },
  { key: 'latestConfirmedBatchAt', header: '최근 확정 배치', width: '180px', cell: (item) => formatConfirmedBatchUsage(item) },
  { key: 'rowNo', header: 'rowNo', align: 'right', cell: (item) => item.rowNo ?? '-' },
];

const uploadHistoryColumns: DataTableColumn<ProductMasterUploadHistory>[] = [
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

export function ProductMasterPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const [searchParams] = useSearchParams();
  const requestedEzadminCode = searchParams.get('ezadminCode') ?? '';
  const [filters, setFilters] = useState<ProductFilters>(() => ({ ...initialFilters, ezadminCode: requestedEzadminCode }));
  const [appliedFilters, setAppliedFilters] = useState<ProductFilters>(() => ({ ...initialFilters, ezadminCode: requestedEzadminCode }));
  const [filtersOpen, setFiltersOpen] = useState(Boolean(requestedEzadminCode));
  const [page, setPage] = useState(0);
  const [productResponse, setProductResponse] = useState<PageResponse<ProductMasterItem> | null>(null);
  const [uploadHistoryResponse, setUploadHistoryResponse] = useState<PageResponse<ProductMasterUploadHistory> | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadPreview, setUploadPreview] = useState<MasterUploadPreviewResult | null>(null);
  const [uploadResult, setUploadResult] = useState<ProductMasterUploadResult | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductMasterItem | null>(null);
  const [productDetail, setProductDetail] = useState<ProductMasterDetail | null>(null);
  const [loadingProductDetail, setLoadingProductDetail] = useState(false);
  const [productDetailError, setProductDetailError] = useState<string | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingUploads, setLoadingUploads] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadSeq, setReloadSeq] = useState(0);
  const canUploadMaster = canManageMasters();

  useEffect(() => {
    if (!requestedEzadminCode) return;

    setFilters((current) => (current.ezadminCode === requestedEzadminCode ? current : { ...current, ezadminCode: requestedEzadminCode }));
    setAppliedFilters((current) => (current.ezadminCode === requestedEzadminCode ? current : { ...current, ezadminCode: requestedEzadminCode }));
    setFiltersOpen(true);
    setPage(0);
  }, [requestedEzadminCode]);

  useEffect(() => {
    let ignore = false;

    async function loadProducts() {
      setLoadingProducts(true);
      setErrorMessage(null);
      try {
        if (!tenantId) {
          setProductResponse({ items: [], page, size: pageSize, totalElements: 0, totalPages: 0 });
          return;
        }
        const result = await omsApi.masters.products.list({
          tenantId,
          ezadminCode: appliedFilters.ezadminCode.trim() || undefined,
          productName: appliedFilters.productName.trim() || undefined,
          storageTemperature: appliedFilters.storageTemperature.trim() || undefined,
          operationStatus: appliedFilters.operationStatus === 'ALL' ? undefined : appliedFilters.operationStatus,
          page,
          size: pageSize,
        });
        if (!ignore) {
          setProductResponse(result);
        }
      } catch (error) {
        if (!ignore) {
          setErrorMessage(formatApiError(error));
        }
      } finally {
        if (!ignore) {
          setLoadingProducts(false);
        }
      }
    }

    loadProducts();
    return () => {
      ignore = true;
    };
  }, [appliedFilters.ezadminCode, appliedFilters.operationStatus, appliedFilters.productName, appliedFilters.storageTemperature, page, reloadSeq, tenantId]);

  useEffect(() => {
    let ignore = false;

    async function loadUploads() {
      setLoadingUploads(true);
      try {
        if (!tenantId) {
          setUploadHistoryResponse({ items: [], page: 0, size: 20, totalElements: 0, totalPages: 0 });
          return;
        }
        const result = await omsApi.masters.products.uploads({ tenantId, page: 0, size: 20 });
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

  const activeFilterCount = useMemo(() => countActiveProductFilters(appliedFilters), [appliedFilters]);
  const hasPendingFilters = useMemo(() => !areFilterStatesEqual(filters, appliedFilters), [appliedFilters, filters]);
  const products = productResponse?.items ?? [];
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

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setSelectedFile(null);
      setUploadError('상품 마스터는 CSV 파일만 업로드할 수 있습니다.');
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
      setUploadError('업로드할 CSV 파일을 먼저 선택해 주세요.');
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const preview = await omsApi.masters.products.previewCsv({
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

      const result = await omsApi.masters.products.applyUpload({
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
      const result = await omsApi.masters.products.applyUpload({
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
      await omsApi.masters.products.cancelUpload({
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

  function updateFilter<TKey extends keyof ProductFilters>(key: TKey, value: ProductFilters[TKey]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters() {
    setPage(0);
    setAppliedFilters(filters);
    setFiltersOpen(false);
  }

  function resetFilters() {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
    setPage(0);
  }

  async function openProductDetail(item: ProductMasterItem) {
    if (!tenantId) return;

    setSelectedProduct(item);
    setProductDetail(null);
    setProductDetailError(null);
    setLoadingProductDetail(true);

    try {
      const detail = await omsApi.masters.products.detail({ tenantId, productId: item.id });
      setProductDetail(detail);
    } catch (error) {
      setProductDetailError(formatApiError(error));
    } finally {
      setLoadingProductDetail(false);
    }
  }

  function closeProductDetail() {
    setSelectedProduct(null);
    setProductDetail(null);
    setProductDetailError(null);
  }

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MasterMetric title="현재 상품" value={`${(productResponse?.totalElements ?? 0).toLocaleString()}건`} description="조회 가능한 상품 기준정보" />
        <MasterMetric title="최근 업로드" value={latestUpload ? formatDateTime(latestUpload.uploadedAt) : '-'} description={latestUpload?.fileName ?? '업로드 이력 없음'} />
        <MasterMetric title="최근 반영 결과" value={latestUpload ? `${latestUpload.rowCount.toLocaleString()}건` : '-'} description={formatUploadCounts(latestUpload)} />
        <MasterMetric title="관리 항목" value="상품 기준정보" description="상품명, 입수량, 출고단위, 보관온도" />
      </section>

      <ProductFilterPanel
        activeFilterCount={activeFilterCount}
        filters={filters}
        hasPendingFilters={hasPendingFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        onToggleOpen={() => setFiltersOpen((current) => !current)}
        open={filtersOpen}
        updateFilter={updateFilter}
      />

      <section className="space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-950">현재 상품 마스터</h2>
            <p className="text-sm text-slate-500">
              조회 결과 {(productResponse?.totalElements ?? 0).toLocaleString()}건
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setIsHistoryModalOpen(true)} variant="secondary">
              업로드 이력
            </Button>
            {canUploadMaster ? (
              <Button onClick={openUploadModal} variant="primary">
                CSV 업로드
              </Button>
            ) : null}
          </div>
        </div>

        {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
        {loadingProducts ? (
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-900">상품 마스터를 조회하는 중입니다.</p>
            <p className="mt-2 text-sm text-slate-500">상품 기준정보를 불러오고 있습니다.</p>
          </Card>
        ) : (
          <>
            <DataTable
              columns={productColumns}
              data={products}
              emptyDescription="상품코드, 상품명, 운영여부, 보관온도 필터를 다시 확인해 주세요."
              emptyTitle="조회 결과가 없습니다."
              getRowKey={(item) => String(item.id)}
              onRowClick={openProductDetail}
              renderMobileCard={renderProductMobileCard}
            />
            <Pagination
              page={page + 1}
              total={productResponse?.totalElements ?? 0}
              totalPages={Math.max(productResponse?.totalPages ?? 0, 1)}
              onPageChange={(nextPage) => setPage(nextPage - 1)}
            />
          </>
        )}
      </section>

      {uploading ? (
        <FullScreenLoadingOverlay
          description={uploadPreview ? '선택한 정상행을 현재 상품 마스터에 반영하는 중입니다.' : '상품 기준정보를 검사하고 현재 마스터 반영 여부를 확인하는 중입니다.'}
          detail={selectedFile?.name}
          title={uploadPreview ? '상품 마스터를 반영하고 있습니다' : '상품 마스터를 검사하고 있습니다'}
        />
      ) : null}

      {canUploadMaster ? (
        <Modal open={isUploadModalOpen} title="상품 마스터 CSV 업로드" onClose={() => setIsUploadModalOpen(false)}>
          {uploadPreview ? (
            <MasterUploadReviewPanel
              loading={uploading}
              masterLabel="상품 마스터"
              onCancel={handleCancelPreview}
              onConfirm={handleApplyPreview}
              preview={uploadPreview}
              target="product"
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
                <p className="text-sm text-slate-500">선택한 CSV를 먼저 검사한 뒤 현재 상품 기준정보 반영 여부를 결정합니다.</p>
                <Badge tone="teal">ADMIN</Badge>
              </div>
              <FileUploadDropzone
                accept=".csv"
                acceptLabel="CSV"
                description="상품명, 운영여부, 거래처 상품코드, 박스입수량, 출고단위, 보관온도, CBM 컬럼을 포함한 상품 마스터 CSV 파일"
                disabled={uploading}
                onFileRemove={() => {
                  setSelectedFile(null);
                  setUploadError('');
                }}
                onFileSelect={handleFileSelect}
                selectedFileName={selectedFile?.name}
                title="상품 마스터 CSV 선택"
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

      <Modal open={isHistoryModalOpen} title="상품 마스터 업로드 이력" size="wide" onClose={() => setIsHistoryModalOpen(false)}>
        {loadingUploads ? (
          <Card className="p-6">
            <p className="text-sm font-semibold text-slate-900">업로드 이력을 조회하는 중입니다.</p>
          </Card>
        ) : (
          <DataTable
            columns={uploadHistoryColumns}
            data={uploadHistoryResponse?.items ?? []}
            emptyDescription="아직 상품 마스터 업로드 이력이 없습니다."
            emptyTitle="업로드 이력이 없습니다."
            getRowKey={(item) => String(item.id ?? item.uploadId)}
            renderMobileCard={renderProductUploadMobileCard}
          />
        )}
      </Modal>

      <ProductMasterDetailModal
        detail={productDetail}
        error={productDetailError}
        fallbackItem={selectedProduct}
        loading={loadingProductDetail}
        onClose={closeProductDetail}
      />
    </div>
  );
}

function renderProductMobileCard(item: ProductMasterItem) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CodeCell value={item.ezadminCode} />
            <OperationStatusBadge item={item} />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-950" title={item.productName ?? '-'}>{item.productName ?? '-'}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{item.temperatureType ?? item.storageTemperature ?? '-'}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-950">{item.outboundUnit ?? '-'}</p>
          <p className="text-xs font-semibold text-slate-500">출고단위</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <MobileFact label="거래처 상품" value={<CodeCell value={item.customerProductCode ?? item.clientProductCode ?? ''} />} />
        <MobileFact label="박스 입수" value={formatNumber(item.boxQty, 3)} />
        <MobileFact label="CBM" value={formatNumber(item.cbm, 6)} />
        <MobileFact label="최근 확정 배치" value={formatConfirmedBatchUsage(item)} />
      </div>
    </div>
  );
}

function renderProductUploadMobileCard(item: ProductMasterUploadHistory) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <UploadStatusBadge status={item.status} />
            <CodeCell value={String(item.uploadId)} />
          </div>
          <p className="mt-2 truncate text-sm font-bold text-slate-950" title={item.fileName ?? '-'}>{item.fileName ?? '-'}</p>
          <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.uploadedAt)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-950">{item.rowCount.toLocaleString()}</p>
          <p className="text-xs font-semibold text-slate-500">rows</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
        <MobileFact label="신규" value={item.insertedCount.toLocaleString()} />
        <MobileFact label="수정" value={item.updatedCount.toLocaleString()} />
        <MobileFact label="유지" value={item.unchangedCount.toLocaleString()} />
        <MobileFact label="실패" value={item.failedCount.toLocaleString()} />
      </div>
    </div>
  );
}

function MobileFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <div className="mt-1 min-w-0 truncate font-semibold text-slate-800">{value}</div>
    </div>
  );
}

function MasterMetric({ description, title, value }: { description: string; title: string; value: string }) {
  return (
    <Card className="p-3 sm:p-4">
      <p className="text-xs font-semibold text-slate-500">{title}</p>
      <p className="mt-2 truncate text-lg font-bold text-slate-950">{value}</p>
      <p className="mt-1 hidden truncate text-xs text-slate-500 sm:block">{description}</p>
    </Card>
  );
}

function ProductFilterPanel({
  activeFilterCount,
  filters,
  hasPendingFilters,
  onApply,
  onReset,
  onToggleOpen,
  open,
  updateFilter,
}: {
  activeFilterCount: number;
  filters: ProductFilters;
  hasPendingFilters: boolean;
  onApply: () => void;
  onReset: () => void;
  onToggleOpen: () => void;
  open: boolean;
  updateFilter: <TKey extends keyof ProductFilters>(key: TKey, value: ProductFilters[TKey]) => void;
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
            {hasPendingFilters ? <Badge tone="amber">검색 필요</Badge> : null}
          </div>
          <p className="mt-1 hidden text-xs text-slate-500 sm:block">상품코드, 상품명, 운영여부, 보관온도로 현재 상품 기준정보를 찾습니다.</p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2" onClick={(event) => event.stopPropagation()}>
          <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">
            검색
          </Button>
          <Button disabled={activeFilterCount === 0 && !hasPendingFilters} onClick={onReset} size="sm" variant="ghost">
            초기화
          </Button>
          <Button aria-expanded={open} onClick={onToggleOpen} size="sm" variant="secondary">
            {open ? '필터 닫기' : '상세 필터'}
          </Button>
        </div>
      </div>

      {open ? (
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid gap-3 lg:grid-cols-4">
            <Input
              label="이지어드민 상품코드"
              onChange={(event) => updateFilter('ezadminCode', event.target.value)}
              placeholder="P000001"
              value={filters.ezadminCode}
            />
            <Input
              label="상품명"
              onChange={(event) => updateFilter('productName', event.target.value)}
              placeholder="상품명"
              value={filters.productName}
            />
            <Select
              label="운영여부"
              onChange={(event) => updateFilter('operationStatus', event.target.value as ProductOperationStatus)}
              options={[
                { label: '전체', value: 'ALL' },
                { label: '운영', value: 'ACTIVE' },
                { label: '중지', value: 'INACTIVE' },
              ]}
              value={filters.operationStatus}
            />
            <Input
              label="보관온도"
              onChange={(event) => updateFilter('storageTemperature', event.target.value)}
              placeholder="냉장"
              value={filters.storageTemperature}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button disabled={!hasPendingFilters} onClick={onApply} size="sm" variant="primary">
              검색
            </Button>
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
  result: ProductMasterUploadResult;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-teal-200 bg-teal-50 px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-base font-bold text-teal-900">상품 마스터 업로드가 완료되었습니다</p>
            <p className="mt-1 text-sm leading-6 text-teal-800">처리 결과가 현재 상품 기준정보에 반영되었습니다.</p>
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

function MasterUploadResultSummary({ result }: { result: ProductMasterUploadResult }) {
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
        <SummaryCount label="수정" value={result.updatedCount} tone="text-slate-700" />
        <SummaryCount label="유지" value={result.unchangedCount} />
        <SummaryCount label="실패" value={result.failedCount} tone={result.failedCount > 0 ? 'text-red-700' : 'text-slate-950'} />
      </div>

      {result.failedCount > 0 ? <ProductUploadFailureNotice failedCount={result.failedCount} /> : null}

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

function ProductUploadFailureNotice({ failedCount }: { failedCount: number }) {
  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
      <p className="text-sm font-bold text-amber-900">일부 행은 반영되지 않았습니다</p>
      <p className="mt-1 text-sm leading-6 text-amber-800">
        실패 {failedCount.toLocaleString()}건은 상품코드가 비어 있거나, 같은 CSV 안에 이미 같은 상품코드가 있어 제외된 행입니다.
      </p>
      <p className="mt-2 text-xs leading-5 text-amber-700">
        상품코드를 채우거나 중복 상품코드를 하나로 정리한 뒤 다시 업로드하면 전체 반영할 수 있습니다.
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

function OperationStatusBadge({ item }: { item: ProductMasterItem }) {
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

function countActiveProductFilters(filters: ProductFilters) {
  return [
    filters.ezadminCode.trim(),
    filters.productName.trim(),
    filters.operationStatus !== 'ALL' ? filters.operationStatus : '',
    filters.storageTemperature.trim(),
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

function formatConfirmedBatchUsage(item: ProductMasterItem) {
  if (!item.latestConfirmedBatchAt) {
    return '-';
  }

  const batchNo = item.latestConfirmedBatchNo ? `${item.latestConfirmedBatchNo} · ` : '';
  return `${batchNo}${formatDateTime(item.latestConfirmedBatchAt)}`;
}

function formatUploadCounts(upload: ProductMasterUploadResult | ProductMasterUploadHistory | null) {
  if (!upload) {
    return '아직 반영된 파일 없음';
  }

  return `신규 ${upload.insertedCount.toLocaleString()}건, 수정 ${upload.updatedCount.toLocaleString()}건, 실패 ${upload.failedCount.toLocaleString()}건`;
}

function formatNumber(value?: number | null, maximumFractionDigits = 0) {
  if (value === undefined || value === null) {
    return '-';
  }

  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(Number(value));
}
