import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Download, RotateCcw, Search } from 'lucide-react';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, Input, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { ClientSummary } from '../types/client';
import type {
  ClientMasterVisibilitySetting,
  ClientPublicProductMasterItem,
  ClientPublicStoreRouteMasterItem,
} from '../types/master';

type MasterTab = 'products' | 'storeRoutes';
type ActiveFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';

const activeOptions = [
  { label: '전체', value: 'ALL' },
  { label: '운영 중', value: 'ACTIVE' },
  { label: '중지', value: 'INACTIVE' },
];
const pageSize = 20;

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
          {fakeCurrentUser.userScopeType === 'TENANT' ? (
            <div className="w-full xl:w-80">
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
            </div>
          ) : null}
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
          <DataTable columns={productColumns} data={products} getRowKey={(item) => String(item.id)} renderMobileCard={renderPublicProductCard} />
          <Pagination onPageChange={(page) => setProductPage(page - 1)} page={productPage + 1} total={productResponse?.totalElements ?? 0} totalPages={Math.max(1, productResponse?.totalPages ?? 1)} />
        </>
      ) : (
        <>
          <ResultToolbar disabled={storeRoutes.length === 0} loading={loading} onDownload={() => downloadCsv(storeRouteRows(storeRoutes), '공개_발주고배송지_마스터.csv')} total={storeRouteResponse?.totalElements ?? 0} />
          <DataTable columns={storeRouteColumns} data={storeRoutes} getRowKey={(item) => String(item.id)} renderMobileCard={renderPublicStoreRouteCard} />
          <Pagination onPageChange={(page) => setStoreRoutePage(page - 1)} page={storeRoutePage + 1} total={storeRouteResponse?.totalElements ?? 0} totalPages={Math.max(1, storeRouteResponse?.totalPages ?? 1)} />
        </>
      )}
    </div>
  );
}

const productColumns: DataTableColumn<ClientPublicProductMasterItem>[] = [
  { key: 'ezadminCode', header: '상품코드', width: '160px', cell: (item) => <CodeCell value={item.ezadminCode} /> },
  { key: 'productName', header: '상품명', width: '240px', cell: (item) => item.productName ?? '-' },
  { key: 'customerProductCode', header: '거래처상품코드', width: '170px', cell: (item) => <CodeCell value={item.customerProductCode ?? ''} /> },
  { key: 'boxQty', header: '박스입수량', align: 'right', width: '110px', cell: (item) => formatNumber(item.boxQty) },
  { key: 'outboundUnit', header: '출고단위', width: '110px', cell: (item) => item.outboundUnit ?? '-' },
  { key: 'temperatureType', header: '보관온도', width: '110px', cell: (item) => item.temperatureType ?? '-' },
  { key: 'activeYn', header: '운영상태', width: '100px', cell: (item) => <ActiveBadge active={item.activeYn} /> },
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
  if (!setting) return '사용 범위 공개';
  if (tab === 'products') return setting.productVisibilityMode === 'ALL_PRODUCTS' ? '전체 상품 공개' : '사용 범위 공개';
  return setting.storeRouteVisibilityMode === 'ALL_STORE_ROUTES' ? '전체 발주고 공개' : '사용 범위 공개';
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
