import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, PlusCircle, RotateCcw, Search } from 'lucide-react';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, Input, Modal, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { ClientProductMasterDetailModal, ClientStoreRouteMasterDetailModal, CodeCell } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { ClientSummary } from '../types/client';
import type {
  ClientMasterVisibilitySetting,
  ClientPublicProductMasterDetail,
  ClientPublicProductMasterItem,
  ClientPublicStoreRouteMasterDetail,
  ClientPublicStoreRouteMasterItem,
  MasterDataAddRequest,
  MasterDataAddRequestStatus,
  MasterDataAddRequestType,
} from '../types/master';

type MasterTab = 'products' | 'storeRoutes';
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const activeOptions = [
  { label: '전체', value: 'ALL' },
  { label: '운영 중', value: 'ACTIVE' },
  { label: '중지', value: 'INACTIVE' },
];
const pageSize = 20;
const requestTypeOptions: Array<{ label: string; value: MasterDataAddRequestType }> = [
  { label: '상품 추가', value: 'PRODUCT' },
  { label: '배송지/차량 추가', value: 'STORE_ROUTE' },
  { label: '상품 코드 매핑', value: 'PRODUCT_CODE_MAPPING' },
  { label: '배송지 코드 매핑', value: 'STORE_CODE_MAPPING' },
];

export function ClientPublicMasterPage() {
  const tenantId = fakeCurrentUser.tenantId ?? undefined;
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientId, setClientId] = useState(fakeCurrentUser.clientId ? String(fakeCurrentUser.clientId) : '');
  const [tab, setTab] = useState<MasterTab>('products');
  const [setting, setSetting] = useState<ClientMasterVisibilitySetting | null>(null);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [storeRouteCode, setStoreRouteCode] = useState('');
  const [storeName, setStoreName] = useState('');
  const [active, setActive] = useState<ActiveFilter>('ACTIVE');
  const [productPage, setProductPage] = useState(0);
  const [storeRoutePage, setStoreRoutePage] = useState(0);
  const [productResponse, setProductResponse] = useState<PageResponse<ClientPublicProductMasterItem> | null>(null);
  const [storeRouteResponse, setStoreRouteResponse] = useState<PageResponse<ClientPublicStoreRouteMasterItem> | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ClientPublicProductMasterItem | null>(null);
  const [productDetail, setProductDetail] = useState<ClientPublicProductMasterDetail | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [productDetailError, setProductDetailError] = useState<string | null>(null);
  const [selectedStoreRoute, setSelectedStoreRoute] = useState<ClientPublicStoreRouteMasterItem | null>(null);
  const [storeRouteDetail, setStoreRouteDetail] = useState<ClientPublicStoreRouteMasterDetail | null>(null);
  const [storeRouteDetailLoading, setStoreRouteDetailLoading] = useState(false);
  const [storeRouteDetailError, setStoreRouteDetailError] = useState<string | null>(null);
  const [requestResponse, setRequestResponse] = useState<PageResponse<MasterDataAddRequest> | null>(null);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MasterDataAddRequest | null>(null);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestType, setRequestType] = useState<MasterDataAddRequestType>('PRODUCT');
  const [requestTitle, setRequestTitle] = useState('');
  const [requestFields, setRequestFields] = useState<Record<string, string>>({});
  const [requestMemo, setRequestMemo] = useState('');
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestReloadSeq, setRequestReloadSeq] = useState(0);
  const [searchVersion, setSearchVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (fakeCurrentUser.userScopeType !== 'TENANT' || !tenantId) return;
    let ignore = false;
    omsApi.clients
      .list({ tenantId })
      .then((items) => {
        if (ignore) return;
        setClients(items);
        setClientId((current) => current || String(items[0]?.id ?? ''));
      })
      .catch((error) => {
        if (!ignore) setErrorMessage(formatApiError(error));
      });
    return () => {
      ignore = true;
    };
  }, [tenantId]);

  useEffect(() => {
    const selectedClientId = Number(clientId);
    if (!tenantId || !selectedClientId) return;
    let ignore = false;
    omsApi.masters.clientVisibility
      .getSetting({ tenantId, clientId: selectedClientId })
      .then((value) => {
        if (!ignore) setSetting(value);
      })
      .catch(() => {
        if (!ignore) setSetting(null);
      });
    return () => {
      ignore = true;
    };
  }, [clientId, tenantId]);

  useEffect(() => {
    const selectedClientId = Number(clientId);
    if (!tenantId || !selectedClientId || tab !== 'products') return;
    let ignore = false;
    setLoading(true);
    setErrorMessage(null);
    omsApi.masters.clientMasters.products
      .list({
        tenantId,
        clientId: selectedClientId,
        ezadminCode: productCode.trim() || undefined,
        productName: productName.trim() || undefined,
        activeYn: activeYnFromFilter(active),
        page: productPage,
        size: pageSize,
      })
      .then((value) => {
        if (!ignore) setProductResponse(value);
      })
      .catch((error) => {
        if (!ignore) setErrorMessage(formatApiError(error));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [active, clientId, productPage, searchVersion, tab, tenantId]);

  useEffect(() => {
    const selectedClientId = Number(clientId);
    if (!tenantId || !selectedClientId || tab !== 'storeRoutes') return;
    let ignore = false;
    setLoading(true);
    setErrorMessage(null);
    omsApi.masters.clientMasters.storeRoutes
      .list({
        tenantId,
        clientId: selectedClientId,
        baljugoCode: storeRouteCode.trim() || undefined,
        storeName: storeName.trim() || undefined,
        activeYn: activeYnFromFilter(active),
        page: storeRoutePage,
        size: pageSize,
      })
      .then((value) => {
        if (!ignore) setStoreRouteResponse(value);
      })
      .catch((error) => {
        if (!ignore) setErrorMessage(formatApiError(error));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [active, clientId, searchVersion, storeRoutePage, tab, tenantId]);

  useEffect(() => {
    const selectedClientId = Number(clientId);
    if (!tenantId || !selectedClientId) return;
    let ignore = false;
    setLoadingRequests(true);
    omsApi.masters.masterDataAddRequests
      .list({ tenantId, clientId: selectedClientId, page: 0, size: 5 })
      .then((value) => {
        if (!ignore) setRequestResponse(value);
      })
      .catch(() => {
        if (!ignore) setRequestResponse(null);
      })
      .finally(() => {
        if (!ignore) setLoadingRequests(false);
      });
    return () => {
      ignore = true;
    };
  }, [clientId, requestReloadSeq, tenantId]);

  function search() {
    setProductPage(0);
    setStoreRoutePage(0);
    setSearchVersion((current) => current + 1);
  }

  function reset() {
    setProductCode('');
    setProductName('');
    setStoreRouteCode('');
    setStoreName('');
    setActive('ACTIVE');
    setProductPage(0);
    setStoreRoutePage(0);
    setSearchVersion((current) => current + 1);
  }

  function openRequestModal(defaultType: MasterDataAddRequestType = tab === 'products' ? 'PRODUCT' : 'STORE_ROUTE') {
    setRequestType(defaultType);
    setRequestTitle(defaultRequestTitle(defaultType));
    setRequestFields({});
    setRequestMemo('');
    setRequestError(null);
    setRequestModalOpen(true);
  }

  function closeRequestModal() {
    if (requestSaving) return;
    setRequestModalOpen(false);
    setRequestError(null);
  }

  function updateRequestField(key: string, value: string) {
    setRequestFields((current) => ({ ...current, [key]: value }));
  }

  async function submitMasterDataRequest() {
    const selectedClientId = Number(clientId);
    if (!tenantId || !selectedClientId || requestSaving) return;
    if (!requestTitle.trim()) {
      setRequestError('요청 제목을 입력해 주세요.');
      return;
    }

    setRequestSaving(true);
    setRequestError(null);
    try {
      await omsApi.masters.masterDataAddRequests.create({
        tenantId,
        clientId: selectedClientId,
        requestType,
        title: requestTitle.trim(),
        requestFields,
        requestMemo: requestMemo.trim() || undefined,
        requestedBy: fakeCurrentUser.id ?? undefined,
      });
      setRequestModalOpen(false);
      setRequestReloadSeq((current) => current + 1);
    } catch (error) {
      setRequestError(formatApiError(error));
    } finally {
      setRequestSaving(false);
    }
  }

  async function openProductDetail(item: ClientPublicProductMasterItem) {
    const selectedClientId = Number(clientId);
    if (!tenantId || !selectedClientId) return;

    setSelectedProduct(item);
    setProductDetail(null);
    setProductDetailError(null);
    setProductDetailLoading(true);
    try {
      const detail = await omsApi.masters.clientMasters.products.detail({
        tenantId,
        clientId: selectedClientId,
        productId: item.id,
      });
      setProductDetail(detail);
    } catch (error) {
      setProductDetailError(formatApiError(error));
    } finally {
      setProductDetailLoading(false);
    }
  }

  function closeProductDetail() {
    setSelectedProduct(null);
    setProductDetail(null);
    setProductDetailError(null);
  }

  async function openStoreRouteDetail(item: ClientPublicStoreRouteMasterItem) {
    const selectedClientId = Number(clientId);
    if (!tenantId || !selectedClientId) return;

    setSelectedStoreRoute(item);
    setStoreRouteDetail(null);
    setStoreRouteDetailError(null);
    setStoreRouteDetailLoading(true);
    try {
      const detail = await omsApi.masters.clientMasters.storeRoutes.detail({
        tenantId,
        clientId: selectedClientId,
        storeRouteId: item.id,
      });
      setStoreRouteDetail(detail);
    } catch (error) {
      setStoreRouteDetailError(formatApiError(error));
    } finally {
      setStoreRouteDetailLoading(false);
    }
  }

  function closeStoreRouteDetail() {
    setSelectedStoreRoute(null);
    setStoreRouteDetail(null);
    setStoreRouteDetailError(null);
  }

  const products = productResponse?.items ?? [];
  const storeRoutes = storeRouteResponse?.items ?? [];

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-bold text-slate-950">고객사 공개 마스터 조회</h2>
              <Badge tone="teal">{visibilityLabel(setting, tab)}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">고객사에 공개된 상품 코드와 발주고/배송지 코드를 조회하고 다운로드합니다.</p>
          </div>
          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[320px]">
            {fakeCurrentUser.userScopeType === 'TENANT' ? (
              <Select
                label="고객사"
                onChange={(event) => {
                  setClientId(event.target.value);
                  setProductPage(0);
                  setStoreRoutePage(0);
                }}
                options={clients.map((client) => ({ label: `${client.name} (${client.code})`, value: String(client.id) }))}
                value={clientId}
              />
            ) : null}
            <Button disabled={!clientId} onClick={() => openRequestModal()} variant="primary">
              <PlusCircle aria-hidden="true" size={16} />
              마스터 추가 요청
            </Button>
          </div>
        </div>
      </Card>

      {errorMessage ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div> : null}

      <div className="flex gap-2">
        <TabButton active={tab === 'products'} label="상품 코드" onClick={() => setTab('products')} />
        <TabButton active={tab === 'storeRoutes'} label="발주고/배송지 코드" onClick={() => setTab('storeRoutes')} />
      </div>

      <Card className="p-5">
        <div className="grid gap-3 lg:grid-cols-[1fr_1fr_180px_auto_auto] lg:items-end">
          {tab === 'products' ? (
            <>
              <Input label="상품코드" onChange={(event) => setProductCode(event.target.value)} value={productCode} />
              <Input label="상품명" onChange={(event) => setProductName(event.target.value)} value={productName} />
            </>
          ) : (
            <>
              <Input label="발주고코드" onChange={(event) => setStoreRouteCode(event.target.value)} value={storeRouteCode} />
              <Input label="지점명" onChange={(event) => setStoreName(event.target.value)} value={storeName} />
            </>
          )}
          <Select label="운영상태" onChange={(event) => setActive(event.target.value as ActiveFilter)} options={activeOptions} value={active} />
          <Button disabled={!clientId} onClick={search} variant="primary">
            <Search aria-hidden="true" size={16} />
            검색
          </Button>
          <Button onClick={reset}>
            <RotateCcw aria-hidden="true" size={16} />
            초기화
          </Button>
        </div>
      </Card>

      {tab === 'products' ? (
        <>
          <ResultToolbar disabled={products.length === 0} loading={loading} onDownload={() => downloadCsv(productRows(products), '공개_상품_마스터.csv')} total={productResponse?.totalElements ?? 0} />
          <DataTable columns={productColumns} data={products} getRowKey={(item) => String(item.id)} onRowClick={openProductDetail} renderMobileCard={renderPublicProductCard} />
          <Pagination onPageChange={(page) => setProductPage(page - 1)} page={productPage + 1} total={productResponse?.totalElements ?? 0} totalPages={Math.max(1, productResponse?.totalPages ?? 1)} />
        </>
      ) : (
        <>
          <ResultToolbar disabled={storeRoutes.length === 0} loading={loading} onDownload={() => downloadCsv(storeRouteRows(storeRoutes), '공개_발주고배송지_마스터.csv')} total={storeRouteResponse?.totalElements ?? 0} />
          <DataTable columns={storeRouteColumns} data={storeRoutes} getRowKey={(item) => String(item.id)} onRowClick={openStoreRouteDetail} renderMobileCard={renderPublicStoreRouteCard} />
          <Pagination onPageChange={(page) => setStoreRoutePage(page - 1)} page={storeRoutePage + 1} total={storeRouteResponse?.totalElements ?? 0} totalPages={Math.max(1, storeRouteResponse?.totalPages ?? 1)} />
        </>
      )}
      <MasterDataAddRequestHistory loading={loadingRequests} onSelectRequest={setSelectedRequest} requests={requestResponse?.items ?? []} />
      <ClientProductMasterDetailModal
        detail={productDetail}
        error={productDetailError}
        fallbackItem={selectedProduct}
        loading={productDetailLoading}
        onClose={closeProductDetail}
      />
      <ClientStoreRouteMasterDetailModal
        detail={storeRouteDetail}
        error={storeRouteDetailError}
        fallbackItem={selectedStoreRoute}
        loading={storeRouteDetailLoading}
        onClose={closeStoreRouteDetail}
      />
      <RequestDetailModal onClose={() => setSelectedRequest(null)} request={selectedRequest} />
      <Modal open={requestModalOpen} title="마스터 데이터 추가 요청" size="wide" onClose={closeRequestModal}>
        <div className="space-y-5">
          <div className="grid gap-3 lg:grid-cols-2">
            <Select
              label="요청 유형"
              onChange={(event) => {
                const nextType = event.target.value as MasterDataAddRequestType;
                setRequestType(nextType);
                setRequestTitle(defaultRequestTitle(nextType));
                setRequestFields({});
              }}
              options={requestTypeOptions}
              value={requestType}
            />
            <Input label="요청 제목" onChange={(event) => setRequestTitle(event.target.value)} placeholder="예: 신상품 3종 추가 요청" value={requestTitle} />
          </div>
          <RequestFieldGrid fields={requestFields} requestType={requestType} updateField={updateRequestField} />
          <div>
            <label className="text-sm font-semibold text-slate-700" htmlFor="master-request-memo">요청 메모</label>
            <textarea
              className="mt-1 min-h-28 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 shadow-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              id="master-request-memo"
              onChange={(event) => setRequestMemo(event.target.value)}
              placeholder="추가 사유, 적용 희망일, 참고사항을 입력해 주세요."
              value={requestMemo}
            />
          </div>
          {requestError ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{requestError}</div> : null}
          <div className="flex justify-end gap-2">
            <Button disabled={requestSaving} onClick={closeRequestModal} variant="ghost">닫기</Button>
            <Button disabled={requestSaving || !clientId} onClick={submitMasterDataRequest} variant="primary">
              {requestSaving ? '등록 중' : '요청 등록'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const productColumns: DataTableColumn<ClientPublicProductMasterItem>[] = [
  { key: 'productName', header: '상품명', width: '320px', cell: (item) => <span className="font-semibold text-slate-900">{item.productName ?? '-'}</span> },
  { key: 'ezadminCode', header: '상품코드', width: '110px', cell: (item) => <CodeCell value={item.ezadminCode} /> },
  { key: 'customerProductCode', header: '거래처상품코드', width: '170px', cell: (item) => <CodeCell value={item.customerProductCode ?? ''} /> },
  { key: 'boxQty', header: '박스입수량', align: 'right', width: '110px', cell: (item) => formatNumber(item.boxQty) },
  { key: 'outboundUnit', header: '출고단위', width: '110px', cell: (item) => item.outboundUnit ?? '-' },
  { key: 'temperatureType', header: '보관온도', width: '110px', cell: (item) => item.temperatureType ?? '-' },
  { key: 'activeYn', header: '운영상태', width: '100px', cell: (item) => <ActiveBadge active={item.activeYn} /> },
  { key: 'latestConfirmedBatchAt', header: '최근 확정 배치', width: '180px', cell: (item) => formatConfirmedBatchUsage(item) },
];

const storeRouteColumns: DataTableColumn<ClientPublicStoreRouteMasterItem>[] = [
  { key: 'baljugoCode', header: '발주고코드', width: '160px', cell: (item) => <CodeCell value={item.baljugoCode} /> },
  { key: 'customerCode', header: '거래처코드', width: '140px', cell: (item) => <CodeCell value={item.customerCode ?? ''} /> },
  { key: 'brandName', header: '브랜드명', width: '150px', cell: (item) => item.brandName ?? '-' },
  { key: 'storeName', header: '지점명', width: '180px', cell: (item) => item.storeName ?? '-' },
  { key: 'area', header: '권역', width: '110px', cell: (item) => item.area ?? '-' },
  { key: 'deliveryDay', header: '배송요일', width: '110px', cell: (item) => item.deliveryDay ?? '-' },
  { key: 'deliveryRound', header: '차수', width: '90px', cell: (item) => item.deliveryRound ?? '-' },
  { key: 'vehicleName', header: '차량명', width: '130px', cell: (item) => item.vehicleName ?? '-' },
  { key: 'activeYn', header: '운영상태', width: '100px', cell: (item) => <ActiveBadge active={item.activeYn} /> },
  { key: 'latestConfirmedBatchAt', header: '최근 확정 배치', width: '180px', cell: (item) => formatConfirmedBatchUsage(item) },
];

function renderPublicProductCard(item: ClientPublicProductMasterItem) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CodeCell value={item.ezadminCode} />
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{item.productName ?? '-'}</p>
        </div>
        <ActiveBadge active={item.activeYn} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
        <MobileField label="거래처상품코드" value={<CodeCell value={item.customerProductCode ?? ''} />} />
        <MobileField label="박스입수량" value={formatNumber(item.boxQty)} />
        <MobileField label="출고단위" value={item.outboundUnit ?? '-'} />
        <MobileField label="보관온도" value={item.temperatureType ?? '-'} />
        <MobileField label="최근 확정 배치" value={formatConfirmedBatchUsage(item)} />
      </div>
    </div>
  );
}

function renderPublicStoreRouteCard(item: ClientPublicStoreRouteMasterItem) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <CodeCell value={item.baljugoCode} />
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{item.storeName ?? '-'}</p>
        </div>
        <ActiveBadge active={item.activeYn} />
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
        <MobileField label="거래처코드" value={<CodeCell value={item.customerCode ?? ''} />} />
        <MobileField label="권역" value={item.area ?? '-'} />
        <MobileField label="배송요일" value={item.deliveryDay ?? '-'} />
        <MobileField label="차량명" value={item.vehicleName ?? '-'} />
        <MobileField label="최근 확정 배치" value={formatConfirmedBatchUsage(item)} />
      </div>
    </div>
  );
}

function MobileField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="font-semibold text-slate-400">{label}</p>
      <div className="mt-1 min-w-0 truncate text-slate-700">{value}</div>
    </div>
  );
}

function ResultToolbar({ disabled, loading, onDownload, total }: { disabled: boolean; loading: boolean; onDownload: () => void; total: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-600">{loading ? '조회 중...' : `총 ${total.toLocaleString()}건`}</p>
      <Button disabled={disabled} onClick={onDownload}>
        <Download aria-hidden="true" size={16} />
        현재 결과 다운로드
      </Button>
    </div>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button className={`h-10 rounded-md border px-4 text-sm font-semibold ${active ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700'}`} onClick={onClick} type="button">
      {label}
    </button>
  );
}

function ActiveBadge({ active }: { active: boolean }) {
  return <Badge tone={active ? 'teal' : 'neutral'}>{active ? '운영 중' : '중지'}</Badge>;
}

function visibilityLabel(setting: ClientMasterVisibilitySetting | null, tab: MasterTab) {
  if (tab === 'products') {
    return setting?.productVisibilityMode === 'ALL_PRODUCTS' ? '전체 상품 공개' : '선택한 상품만 공개';
  }
  return setting?.storeRouteVisibilityMode === 'ALL_STORE_ROUTES' ? '전체 발주고 공개' : '선택한 발주고/배송지만 공개';
}

function activeYnFromFilter(value: ActiveFilter) {
  if (value === 'ACTIVE') return true;
  if (value === 'INACTIVE') return false;
  return undefined;
}

function formatNumber(value?: number | null) {
  return value === null || value === undefined ? '-' : value.toLocaleString();
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError || error instanceof Error) return error.message;
  return '요청 처리 중 오류가 발생했습니다.';
}

function productRows(items: ClientPublicProductMasterItem[]) {
  return [
    ['상품코드', '상품명', '거래처상품코드', '박스입수량', '출고단위', '보관온도', '운영상태'],
    ...items.map((item) => [item.ezadminCode, item.productName ?? '', item.customerProductCode ?? '', item.boxQty ?? '', item.outboundUnit ?? '', item.temperatureType ?? '', item.activeYn ? '운영 중' : '중지']),
  ];
}

function storeRouteRows(items: ClientPublicStoreRouteMasterItem[]) {
  return [
    ['발주고코드', '거래처코드', '브랜드명', '지점명', '권역', '배송요일', '차수', '차량명', '운영상태'],
    ...items.map((item) => [item.baljugoCode, item.customerCode ?? '', item.brandName ?? '', item.storeName ?? '', item.area ?? '', item.deliveryDay ?? '', item.deliveryRound ?? '', item.vehicleName ?? '', item.activeYn ? '운영 중' : '중지']),
  ];
}

function downloadCsv(rows: Array<Array<string | number>>, fileName: string) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' }));
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

const requestFieldSpecs: Record<MasterDataAddRequestType, Array<{ key: string; label: string; placeholder?: string }>> = {
  PRODUCT: [
    { key: 'productName', label: '상품명', placeholder: '예: 상온_신상품 1kg' },
    { key: 'customerProductCode', label: '거래처상품코드', placeholder: '고객사 내부 상품코드' },
    { key: 'outboundUnit', label: '출고단위', placeholder: 'EA, BOX 등' },
    { key: 'boxQty', label: '박스입수량', placeholder: '예: 20' },
    { key: 'temperatureType', label: '보관온도', placeholder: '상온, 냉장, 냉동' },
  ],
  STORE_ROUTE: [
    { key: 'storeName', label: '지점명', placeholder: '예: 강남점' },
    { key: 'customerCode', label: '거래처코드', placeholder: '고객사 거래처코드' },
    { key: 'brandName', label: '브랜드명' },
    { key: 'area', label: '권역' },
    { key: 'deliveryRound', label: '차수' },
    { key: 'vehicleName', label: '차량명' },
    { key: 'address', label: '주소' },
  ],
  PRODUCT_CODE_MAPPING: [
    { key: 'clientProductCode', label: '고객사 상품코드' },
    { key: 'ezadminCode', label: 'OMS 상품코드' },
    { key: 'productName', label: '상품명' },
  ],
  STORE_CODE_MAPPING: [
    { key: 'clientStoreCode', label: '고객사 배송지코드' },
    { key: 'baljugoCode', label: '발주고코드' },
    { key: 'storeName', label: '지점명' },
  ],
};

function RequestFieldGrid({
  fields,
  requestType,
  updateField,
}: {
  fields: Record<string, string>;
  requestType: MasterDataAddRequestType;
  updateField: (key: string, value: string) => void;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {requestFieldSpecs[requestType].map((field) => (
        <Input
          key={field.key}
          label={field.label}
          onChange={(event) => updateField(field.key, event.target.value)}
          placeholder={field.placeholder}
          value={fields[field.key] ?? ''}
        />
      ))}
    </div>
  );
}

function RequestDetailModal({
  onClose,
  request,
}: {
  onClose: () => void;
  request: MasterDataAddRequest | null;
}) {
  if (!request) return null;

  return (
    <Modal open title="마스터 요청 상세" size="wide" onClose={onClose}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={requestStatusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
          <Badge tone="neutral">{requestTypeLabel(request.requestType)}</Badge>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <RequestDetailSection title="요청 정보">
            <RequestDetailItem label="제목" value={request.title} />
            <RequestDetailItem label="요청일시" value={formatDateTime(request.requestedAt)} />
            <RequestDetailItem label="요청 메모" value={request.requestMemo ?? '-'} />
          </RequestDetailSection>
          <RequestDetailSection title="처리 정보">
            <RequestDetailItem label="상태" value={requestStatusLabel(request.status)} />
            <RequestDetailItem label="검토일시" value={formatDateTime(request.reviewedAt)} />
            <RequestDetailItem label="처리 메모" value={request.reviewComment ?? '-'} />
            <RequestDetailItem
              label="반영 마스터"
              value={request.appliedMasterType && request.appliedMasterItemId ? `${request.appliedMasterType} #${request.appliedMasterItemId}` : '-'}
            />
          </RequestDetailSection>
        </div>

        <RequestDetailSection title="요청 필드">
          <div className="grid gap-3 lg:grid-cols-2">
            {Object.entries(request.requestFields).length === 0 ? (
              <p className="text-sm text-slate-500">입력된 상세 필드가 없습니다.</p>
            ) : (
              Object.entries(request.requestFields).map(([key, value]) => (
                <RequestDetailItem key={key} label={requestFieldLabel(key)} value={value || '-'} />
              ))
            )}
          </div>
        </RequestDetailSection>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="primary">확인</Button>
        </div>
      </div>
    </Modal>
  );
}

function RequestDetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm font-bold text-slate-950">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function RequestDetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="break-all text-sm text-slate-900">{value}</p>
    </div>
  );
}

function MasterDataAddRequestHistory({
  loading,
  onSelectRequest,
  requests,
}: {
  loading: boolean;
  onSelectRequest: (request: MasterDataAddRequest) => void;
  requests: MasterDataAddRequest[];
}) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-950">최근 마스터 추가 요청</h3>
          <p className="mt-1 text-xs text-slate-500">{loading ? '요청 내역을 불러오는 중입니다.' : `최근 ${requests.length.toLocaleString()}건`}</p>
        </div>
      </div>
      {requests.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
          등록된 마스터 추가 요청이 없습니다.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-y border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-3 py-2">요청일시</th>
                <th className="px-3 py-2">유형</th>
                <th className="px-3 py-2">제목</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">검토 의견</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((request) => (
                <tr
                  key={request.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => onSelectRequest(request)}
                >
                  <td className="whitespace-nowrap px-3 py-3 text-slate-600">{formatDateTime(request.requestedAt)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-700">{requestTypeLabel(request.requestType)}</td>
                  <td className="min-w-[220px] px-3 py-3 font-semibold text-slate-950">{request.title}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <Badge tone={requestStatusTone(request.status)}>{requestStatusLabel(request.status)}</Badge>
                  </td>
                  <td className="min-w-[220px] px-3 py-3 text-slate-600">{request.reviewComment ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function requestTypeLabel(value: MasterDataAddRequestType) {
  return requestTypeOptions.find((option) => option.value === value)?.label ?? value;
}

function requestFieldLabel(key: string) {
  const labels: Record<string, string> = {
    productName: '상품명',
    customerProductCode: '거래처 상품코드',
    outboundUnit: '출고단위',
    boxQty: '박스입수량',
    temperatureType: '보관온도',
    storeName: '지점명',
    customerCode: '거래처코드',
    brandName: '브랜드명',
    area: '권역',
    deliveryRound: '차수',
    vehicleName: '차량명',
    address: '주소',
    clientProductCode: '고객사 상품코드',
    ezadminCode: 'OMS 상품코드',
    clientStoreCode: '고객사 배송지코드',
    baljugoCode: '발주고코드',
  };
  return labels[key] ?? key;
}

function defaultRequestTitle(value: MasterDataAddRequestType) {
  return `${requestTypeLabel(value)} 요청`;
}

function requestStatusLabel(value: MasterDataAddRequestStatus) {
  switch (value) {
    case 'REQUESTED':
      return '요청 대기';
    case 'NEEDS_MORE_INFO':
      return '보완 요청';
    case 'REJECTED':
      return '반려';
    case 'APPROVED':
      return '승인';
    case 'APPLIED':
      return '반영 완료';
    default:
      return value;
  }
}

function requestStatusTone(value: MasterDataAddRequestStatus): 'neutral' | 'teal' | 'amber' | 'red' {
  switch (value) {
    case 'REQUESTED':
      return 'amber';
    case 'NEEDS_MORE_INFO':
      return 'neutral';
    case 'REJECTED':
      return 'red';
    case 'APPROVED':
    case 'APPLIED':
      return 'teal';
    default:
      return 'neutral';
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return value.replace('T', ' ').slice(0, 16);
}

function formatConfirmedBatchUsage(item: ClientPublicProductMasterItem | ClientPublicStoreRouteMasterItem) {
  if (!item.latestConfirmedBatchAt) {
    return '-';
  }

  const batchNo = item.latestConfirmedBatchNo ? `${item.latestConfirmedBatchNo} · ` : '';
  return `${batchNo}${formatDateTime(item.latestConfirmedBatchAt)}`;
}
