import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Plus, RotateCcw, Save, Search, ShieldCheck, Trash2 } from 'lucide-react';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { fakeCurrentUser } from '../app/auth';
import { Badge, Button, Card, FullScreenLoadingOverlay, Input, Select } from '../components/common';
import { DataTable, Pagination, type DataTableColumn } from '../components/data';
import { CodeCell } from '../components/domain';
import type { PageResponse } from '../types/api';
import type { ClientSummary } from '../types/client';
import type {
  ClientMasterVisibilitySetting,
  ClientProductMasterScopeItem,
  ClientProductMasterVisibilityMode,
  ClientStoreRouteMasterScopeItem,
  ClientStoreRouteMasterVisibilityMode,
  ProductMasterItem,
  StoreRouteMasterItem,
} from '../types/master';

type ScopeTab = 'products' | 'storeRoutes';

interface VisibilityFormState {
  productVisibilityMode: ClientProductMasterVisibilityMode;
  storeRouteVisibilityMode: ClientStoreRouteMasterVisibilityMode;
  showPriceFieldsYn: boolean;
  showSupplierFieldsYn: boolean;
  showStoreRouteInternalFieldsYn: boolean;
}

interface ProductSearchState {
  ezadminCode: string;
  productName: string;
}

interface StoreRouteSearchState {
  baljugoCode: string;
  storeName: string;
}

const defaultFormState: VisibilityFormState = {
  productVisibilityMode: 'SCOPED_ONLY',
  storeRouteVisibilityMode: 'SCOPED_ONLY',
  showPriceFieldsYn: false,
  showSupplierFieldsYn: false,
  showStoreRouteInternalFieldsYn: false,
};

const initialProductSearch: ProductSearchState = { ezadminCode: '', productName: '' };
const initialStoreRouteSearch: StoreRouteSearchState = { baljugoCode: '', storeName: '' };

const productVisibilityOptions = [
  { label: '사용 범위만 공개', value: 'SCOPED_ONLY' },
  { label: '전체 상품 마스터 공개', value: 'ALL_PRODUCTS' },
];

const storeRouteVisibilityOptions = [
  { label: '사용 범위만 공개', value: 'SCOPED_ONLY' },
  { label: '전체 발주고/배송지 공개', value: 'ALL_STORE_ROUTES' },
];

const pageSize = 10;

export function ClientMasterVisibilitySettingsPage() {
  const tenantId = fakeCurrentUser.tenantId ?? null;
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [setting, setSetting] = useState<ClientMasterVisibilitySetting | null>(null);
  const [form, setForm] = useState<VisibilityFormState>(defaultFormState);
  const [scopeTab, setScopeTab] = useState<ScopeTab>('products');
  const [productSearch, setProductSearch] = useState<ProductSearchState>(initialProductSearch);
  const [appliedProductSearch, setAppliedProductSearch] = useState<ProductSearchState>(initialProductSearch);
  const [storeRouteSearch, setStoreRouteSearch] = useState<StoreRouteSearchState>(initialStoreRouteSearch);
  const [appliedStoreRouteSearch, setAppliedStoreRouteSearch] = useState<StoreRouteSearchState>(initialStoreRouteSearch);
  const [productCandidates, setProductCandidates] = useState<PageResponse<ProductMasterItem> | null>(null);
  const [storeRouteCandidates, setStoreRouteCandidates] = useState<PageResponse<StoreRouteMasterItem> | null>(null);
  const [productScopes, setProductScopes] = useState<PageResponse<ClientProductMasterScopeItem> | null>(null);
  const [storeRouteScopes, setStoreRouteScopes] = useState<PageResponse<ClientStoreRouteMasterScopeItem> | null>(null);
  const [productCandidatePage, setProductCandidatePage] = useState(0);
  const [storeRouteCandidatePage, setStoreRouteCandidatePage] = useState(0);
  const [productScopePage, setProductScopePage] = useState(0);
  const [storeRouteScopePage, setStoreRouteScopePage] = useState(0);
  const [reloadSeq, setReloadSeq] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mutatingScope, setMutatingScope] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    async function loadClients() {
      if (!tenantId) return;
      setLoading(true);
      try {
        const result = await omsApi.clients.list({ tenantId });
        if (!ignore) {
          setClients(result);
          setSelectedClientId((current) => current || String(result[0]?.id ?? ''));
        }
      } catch (error) {
        if (!ignore) setErrorMessage(formatApiError(error));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadClients();
    return () => {
      ignore = true;
    };
  }, [tenantId]);

  useEffect(() => {
    let ignore = false;
    const clientId = Number(selectedClientId);
    async function loadSetting() {
      if (!tenantId || !Number.isFinite(clientId) || clientId <= 0) return;
      setLoading(true);
      setErrorMessage(null);
      setSavedMessage(null);
      try {
        const result = await omsApi.masters.clientVisibility.getSetting({ tenantId, clientId });
        if (!ignore) {
          setSetting(result);
          setForm({
            productVisibilityMode: result.productVisibilityMode,
            storeRouteVisibilityMode: result.storeRouteVisibilityMode,
            showPriceFieldsYn: result.showPriceFieldsYn,
            showSupplierFieldsYn: result.showSupplierFieldsYn,
            showStoreRouteInternalFieldsYn: result.showStoreRouteInternalFieldsYn,
          });
        }
      } catch (error) {
        if (!ignore) setErrorMessage(formatApiError(error));
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    loadSetting();
    return () => {
      ignore = true;
    };
  }, [selectedClientId, tenantId]);

  useEffect(() => {
    let ignore = false;
    async function loadProducts() {
      if (!tenantId) return;
      try {
        const result = await omsApi.masters.products.list({
          tenantId,
          ezadminCode: appliedProductSearch.ezadminCode.trim() || undefined,
          productName: appliedProductSearch.productName.trim() || undefined,
          activeYn: true,
          page: productCandidatePage,
          size: pageSize,
        });
        if (!ignore) setProductCandidates(result);
      } catch (error) {
        if (!ignore) setErrorMessage(formatApiError(error));
      }
    }
    loadProducts();
    return () => {
      ignore = true;
    };
  }, [appliedProductSearch, productCandidatePage, tenantId]);

  useEffect(() => {
    let ignore = false;
    async function loadStoreRoutes() {
      if (!tenantId) return;
      try {
        const result = await omsApi.masters.storeRoutes.list({
          tenantId,
          baljugoCode: appliedStoreRouteSearch.baljugoCode.trim() || undefined,
          storeName: appliedStoreRouteSearch.storeName.trim() || undefined,
          activeYn: true,
          page: storeRouteCandidatePage,
          size: pageSize,
        });
        if (!ignore) setStoreRouteCandidates(result);
      } catch (error) {
        if (!ignore) setErrorMessage(formatApiError(error));
      }
    }
    loadStoreRoutes();
    return () => {
      ignore = true;
    };
  }, [appliedStoreRouteSearch, storeRouteCandidatePage, tenantId]);

  useEffect(() => {
    let ignore = false;
    const clientId = Number(selectedClientId);
    async function loadScopes() {
      if (!tenantId || !Number.isFinite(clientId) || clientId <= 0) return;
      try {
        const [products, storeRoutes] = await Promise.all([
          omsApi.masters.clientVisibility.productScopes({ tenantId, clientId, status: 'ACTIVE', page: productScopePage, size: pageSize }),
          omsApi.masters.clientVisibility.storeRouteScopes({ tenantId, clientId, status: 'ACTIVE', page: storeRouteScopePage, size: pageSize }),
        ]);
        if (!ignore) {
          setProductScopes(products);
          setStoreRouteScopes(storeRoutes);
        }
      } catch (error) {
        if (!ignore) setErrorMessage(formatApiError(error));
      }
    }
    loadScopes();
    return () => {
      ignore = true;
    };
  }, [productScopePage, reloadSeq, selectedClientId, storeRouteScopePage, tenantId]);

  const selectedClient = useMemo(() => clients.find((client) => String(client.id) === selectedClientId) ?? null, [clients, selectedClientId]);
  const scopedProductIds = useMemo(() => new Set((productScopes?.items ?? []).map((scope) => scope.productMasterItemId)), [productScopes]);
  const scopedStoreRouteIds = useMemo(() => new Set((storeRouteScopes?.items ?? []).map((scope) => scope.storeRouteMasterItemId)), [storeRouteScopes]);
  const changed =
    !setting ||
    setting.productVisibilityMode !== form.productVisibilityMode ||
    setting.storeRouteVisibilityMode !== form.storeRouteVisibilityMode ||
    setting.showPriceFieldsYn !== form.showPriceFieldsYn ||
    setting.showSupplierFieldsYn !== form.showSupplierFieldsYn ||
    setting.showStoreRouteInternalFieldsYn !== form.showStoreRouteInternalFieldsYn;

  async function handleSave() {
    const clientId = Number(selectedClientId);
    if (!tenantId || !Number.isFinite(clientId) || clientId <= 0) return;
    setSaving(true);
    setErrorMessage(null);
    setSavedMessage(null);
    try {
      const result = await omsApi.masters.clientVisibility.updateSetting({ tenantId, clientId, ...form });
      setSetting(result);
      setSavedMessage(`${selectedClient?.name ?? '고객사'} 공개 설정을 저장했습니다.`);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setSaving(false);
    }
  }

  async function addProductScope(item: ProductMasterItem) {
    await mutateScope(async () => {
      const clientId = Number(selectedClientId);
      await omsApi.masters.clientVisibility.upsertProductScope({
        tenantId: requireTenantId(tenantId),
        clientId,
        productMasterItemId: Number(item.id),
        activeYn: true,
        source: 'MANUAL',
      });
      setSavedMessage(`${item.productName ?? item.ezadminCode} 상품을 공개 범위에 추가했습니다.`);
    });
  }

  async function removeProductScope(scope: ClientProductMasterScopeItem) {
    await mutateScope(async () => {
      await omsApi.masters.clientVisibility.upsertProductScope({
        tenantId: requireTenantId(tenantId),
        clientId: scope.clientId,
        productMasterItemId: scope.productMasterItemId,
        activeYn: false,
        source: 'MANUAL',
      });
      setSavedMessage(`${scope.product?.productName ?? scope.product?.ezadminCode ?? '상품'} 공개를 해제했습니다.`);
    });
  }

  async function addStoreRouteScope(item: StoreRouteMasterItem) {
    await mutateScope(async () => {
      const clientId = Number(selectedClientId);
      await omsApi.masters.clientVisibility.upsertStoreRouteScope({
        tenantId: requireTenantId(tenantId),
        clientId,
        storeRouteMasterItemId: Number(item.id),
        activeYn: true,
        source: 'MANUAL',
      });
      setSavedMessage(`${item.storeName ?? item.baljugoCode} 발주고를 공개 범위에 추가했습니다.`);
    });
  }

  async function removeStoreRouteScope(scope: ClientStoreRouteMasterScopeItem) {
    await mutateScope(async () => {
      await omsApi.masters.clientVisibility.upsertStoreRouteScope({
        tenantId: requireTenantId(tenantId),
        clientId: scope.clientId,
        storeRouteMasterItemId: scope.storeRouteMasterItemId,
        activeYn: false,
        source: 'MANUAL',
      });
      setSavedMessage(`${scope.storeRoute?.storeName ?? scope.storeRoute?.baljugoCode ?? '발주고'} 공개를 해제했습니다.`);
    });
  }

  async function mutateScope(action: () => Promise<void>) {
    setMutatingScope(true);
    setErrorMessage(null);
    try {
      await action();
      setReloadSeq((current) => current + 1);
    } catch (error) {
      setErrorMessage(formatApiError(error));
    } finally {
      setMutatingScope(false);
    }
  }

  const productCandidateColumns: DataTableColumn<ProductMasterItem>[] = [
    { key: 'ezadminCode', header: '상품코드', width: '150px', cell: (item) => <CodeCell value={item.ezadminCode} /> },
    { key: 'productName', header: '상품명', width: '220px', cell: (item) => <span className="font-semibold text-slate-900">{item.productName ?? '-'}</span> },
    { key: 'customerProductCode', header: '거래처상품코드', width: '160px', cell: (item) => <CodeCell value={item.customerProductCode ?? ''} /> },
    { key: 'temperatureType', header: '보관온도', width: '110px', cell: (item) => item.temperatureType ?? '-' },
    {
      key: 'action',
      header: '공개',
      width: '110px',
      cell: (item) => {
        const alreadyScoped = scopedProductIds.has(Number(item.id));
        return (
          <Button disabled={alreadyScoped || mutatingScope} onClick={() => addProductScope(item)} size="sm" variant={alreadyScoped ? 'secondary' : 'primary'}>
            <Plus aria-hidden="true" size={14} />
            {alreadyScoped ? '추가됨' : '추가'}
          </Button>
        );
      },
    },
  ];

  const productScopeColumns: DataTableColumn<ClientProductMasterScopeItem>[] = [
    { key: 'ezadminCode', header: '상품코드', width: '150px', cell: (item) => <CodeCell value={item.product?.ezadminCode ?? ''} /> },
    { key: 'productName', header: '상품명', width: '220px', cell: (item) => <span className="font-semibold text-slate-900">{item.product?.productName ?? '-'}</span> },
    { key: 'customerProductCode', header: '거래처상품코드', width: '160px', cell: (item) => <CodeCell value={item.product?.customerProductCode ?? ''} /> },
    { key: 'source', header: '출처', width: '120px', cell: (item) => scopeSourceLabel(item.source) },
    { key: 'action', header: '해제', width: '100px', cell: (item) => <ScopeRemoveButton disabled={mutatingScope} onClick={() => removeProductScope(item)} /> },
  ];

  const storeRouteCandidateColumns: DataTableColumn<StoreRouteMasterItem>[] = [
    { key: 'baljugoCode', header: '발주고코드', width: '150px', cell: (item) => <CodeCell value={item.baljugoCode} /> },
    { key: 'customerCode', header: '거래처코드', width: '130px', cell: (item) => <CodeCell value={item.customerCode ?? item.storeCode ?? ''} /> },
    { key: 'brandName', header: '브랜드명', width: '140px', cell: (item) => item.brandName ?? '-' },
    { key: 'storeName', header: '지점명', width: '180px', cell: (item) => <span className="font-semibold text-slate-900">{item.storeName ?? '-'}</span> },
    { key: 'area', header: '권역', width: '110px', cell: (item) => item.area ?? '-' },
    {
      key: 'action',
      header: '공개',
      width: '110px',
      cell: (item) => {
        const alreadyScoped = scopedStoreRouteIds.has(Number(item.id));
        return (
          <Button disabled={alreadyScoped || mutatingScope} onClick={() => addStoreRouteScope(item)} size="sm" variant={alreadyScoped ? 'secondary' : 'primary'}>
            <Plus aria-hidden="true" size={14} />
            {alreadyScoped ? '추가됨' : '추가'}
          </Button>
        );
      },
    },
  ];

  const storeRouteScopeColumns: DataTableColumn<ClientStoreRouteMasterScopeItem>[] = [
    { key: 'baljugoCode', header: '발주고코드', width: '150px', cell: (item) => <CodeCell value={item.storeRoute?.baljugoCode ?? ''} /> },
    { key: 'customerCode', header: '거래처코드', width: '130px', cell: (item) => <CodeCell value={item.storeRoute?.customerCode ?? ''} /> },
    { key: 'brandName', header: '브랜드명', width: '140px', cell: (item) => item.storeRoute?.brandName ?? '-' },
    { key: 'storeName', header: '지점명', width: '180px', cell: (item) => <span className="font-semibold text-slate-900">{item.storeRoute?.storeName ?? '-'}</span> },
    { key: 'source', header: '출처', width: '120px', cell: (item) => scopeSourceLabel(item.source) },
    { key: 'action', header: '해제', width: '100px', cell: (item) => <ScopeRemoveButton disabled={mutatingScope} onClick={() => removeStoreRouteScope(item)} /> },
  ];

  return (
    <div className="space-y-6">
      {loading || saving || mutatingScope ? <FullScreenLoadingOverlay description="고객사 공개 범위를 처리하고 있습니다." title="처리 중" /> : null}

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ShieldCheck aria-hidden="true" className="h-5 w-5 text-teal-700" />
              <h2 className="text-base font-bold text-slate-950">고객사별 마스터 공개 설정</h2>
              <Badge tone="teal">물류사 관리자</Badge>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">고객사가 조회할 수 있는 상품 코드와 발주고/배송지 코드의 공개 범위를 고객사 단위로 관리합니다.</p>
          </div>
          <div className="w-full lg:w-80">
            <Select
              disabled={clients.length === 0}
              label="고객사"
              onChange={(event) => {
                setSelectedClientId(event.target.value);
                setProductScopePage(0);
                setStoreRouteScopePage(0);
              }}
              options={clients.map((client) => ({ label: `${client.name} (${client.code})`, value: String(client.id) }))}
              value={selectedClientId}
            />
          </div>
        </div>
      </Card>

      {errorMessage ? <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</div> : null}
      {savedMessage ? <div className="rounded-md border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-700">{savedMessage}</div> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SummaryPanel label="상품 마스터" title={productVisibilityLabel(form.productVisibilityMode)} tone={form.productVisibilityMode === 'ALL_PRODUCTS' ? 'amber' : 'neutral'} />
        <SummaryPanel label="발주고/배송지" title={storeRouteVisibilityLabel(form.storeRouteVisibilityMode)} tone={form.storeRouteVisibilityMode === 'ALL_STORE_ROUTES' ? 'amber' : 'neutral'} />
        <SummaryPanel label="내부 배송 정보" title={form.showStoreRouteInternalFieldsYn ? '차량/기사/주소 공개' : '기본 비공개'} tone={form.showStoreRouteInternalFieldsYn ? 'amber' : 'teal'} />
      </div>

      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <Select disabled={!selectedClient} label="상품 마스터 공개 모드" onChange={(event) => setForm((current) => ({ ...current, productVisibilityMode: event.target.value as ClientProductMasterVisibilityMode }))} options={productVisibilityOptions} value={form.productVisibilityMode} />
          <Select disabled={!selectedClient} label="발주고/배송지 공개 모드" onChange={(event) => setForm((current) => ({ ...current, storeRouteVisibilityMode: event.target.value as ClientStoreRouteMasterVisibilityMode }))} options={storeRouteVisibilityOptions} value={form.storeRouteVisibilityMode} />
        </div>
        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <VisibilityToggle checked={form.showPriceFieldsYn} disabled={!selectedClient} label="가격 필드 공개" onChange={(checked) => setForm((current) => ({ ...current, showPriceFieldsYn: checked }))} />
          <VisibilityToggle checked={form.showSupplierFieldsYn} disabled={!selectedClient} label="공급처 필드 공개" onChange={(checked) => setForm((current) => ({ ...current, showSupplierFieldsYn: checked }))} />
          <VisibilityToggle checked={form.showStoreRouteInternalFieldsYn} disabled={!selectedClient} label="차량/기사/주소 공개" onChange={(checked) => setForm((current) => ({ ...current, showStoreRouteInternalFieldsYn: checked }))} />
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">{setting?.updatedAt ? `마지막 저장: ${formatDateTime(setting.updatedAt)}` : '저장된 설정이 없으면 기본값으로 사용 범위만 공개됩니다.'}</p>
          <Button disabled={!tenantId || !selectedClient || !changed || saving} onClick={handleSave} variant="primary"><Save aria-hidden="true" size={16} />저장</Button>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-950">수동 공개 범위</h3>
            <p className="mt-1 text-sm text-slate-500">사용 범위만 공개 모드에서 고객사에게 노출할 항목을 직접 추가하거나 해제합니다.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TabButton active={scopeTab === 'products'} label="상품" onClick={() => setScopeTab('products')} />
            <TabButton active={scopeTab === 'storeRoutes'} label="발주고/배송지" onClick={() => setScopeTab('storeRoutes')} />
          </div>
        </div>

        {scopeTab === 'products' ? (
          <div className="mt-5 grid gap-5 2xl:grid-cols-2">
            <ScopeSearchPanel
              left={<Input label="상품코드" onChange={(event) => setProductSearch((current) => ({ ...current, ezadminCode: event.target.value }))} value={productSearch.ezadminCode} />}
              right={<Input label="상품명" onChange={(event) => setProductSearch((current) => ({ ...current, productName: event.target.value }))} value={productSearch.productName} />}
              onReset={() => {
                setProductSearch(initialProductSearch);
                setAppliedProductSearch(initialProductSearch);
                setProductCandidatePage(0);
              }}
              onSearch={() => {
                setAppliedProductSearch(productSearch);
                setProductCandidatePage(0);
              }}
              title="상품 마스터 검색"
            >
              <DataTable
                columns={productCandidateColumns}
                data={productCandidates?.items ?? []}
                emptyDescription="상품코드 또는 상품명으로 검색해 주세요."
                emptyTitle="추가할 상품이 없습니다."
                getRowKey={(item) => String(item.id)}
                renderMobileCard={(item) => {
                  const alreadyScoped = scopedProductIds.has(Number(item.id));
                  return (
                    <ScopeMobileCard
                      action={
                        <Button disabled={alreadyScoped || mutatingScope} onClick={() => addProductScope(item)} size="sm" variant={alreadyScoped ? 'secondary' : 'primary'}>
                          <Plus aria-hidden="true" size={14} />
                          {alreadyScoped ? '추가됨' : '추가'}
                        </Button>
                      }
                      code={<CodeCell value={item.ezadminCode} />}
                      details={[
                        { label: '거래처상품코드', value: <CodeCell value={item.customerProductCode ?? ''} /> },
                        { label: '보관온도', value: item.temperatureType ?? '-' },
                      ]}
                      title={item.productName ?? '-'}
                    />
                  );
                }}
              />
              <Pagination onPageChange={(nextPage) => setProductCandidatePage(nextPage - 1)} page={productCandidatePage + 1} total={productCandidates?.totalElements ?? 0} totalPages={Math.max(productCandidates?.totalPages ?? 0, 1)} />
            </ScopeSearchPanel>

            <ScopeListPanel count={productScopes?.totalElements ?? 0} title="현재 공개 상품">
              <DataTable
                columns={productScopeColumns}
                data={productScopes?.items ?? []}
                emptyDescription="검색 결과에서 상품을 공개 범위에 추가할 수 있습니다."
                emptyTitle="공개된 상품이 없습니다."
                getRowKey={(item) => String(item.id)}
                renderMobileCard={(item) => (
                  <ScopeMobileCard
                    action={<ScopeRemoveButton disabled={mutatingScope} onClick={() => removeProductScope(item)} />}
                    code={<CodeCell value={item.product?.ezadminCode ?? ''} />}
                    details={[
                      { label: '거래처상품코드', value: <CodeCell value={item.product?.customerProductCode ?? ''} /> },
                      { label: '출처', value: scopeSourceLabel(item.source) },
                    ]}
                    title={item.product?.productName ?? '-'}
                  />
                )}
              />
              <Pagination onPageChange={(nextPage) => setProductScopePage(nextPage - 1)} page={productScopePage + 1} total={productScopes?.totalElements ?? 0} totalPages={Math.max(productScopes?.totalPages ?? 0, 1)} />
            </ScopeListPanel>
          </div>
        ) : (
          <div className="mt-5 grid gap-5 2xl:grid-cols-2">
            <ScopeSearchPanel
              left={<Input label="발주고코드" onChange={(event) => setStoreRouteSearch((current) => ({ ...current, baljugoCode: event.target.value }))} value={storeRouteSearch.baljugoCode} />}
              right={<Input label="지점명" onChange={(event) => setStoreRouteSearch((current) => ({ ...current, storeName: event.target.value }))} value={storeRouteSearch.storeName} />}
              onReset={() => {
                setStoreRouteSearch(initialStoreRouteSearch);
                setAppliedStoreRouteSearch(initialStoreRouteSearch);
                setStoreRouteCandidatePage(0);
              }}
              onSearch={() => {
                setAppliedStoreRouteSearch(storeRouteSearch);
                setStoreRouteCandidatePage(0);
              }}
              title="발주고/배송지 마스터 검색"
            >
              <DataTable
                columns={storeRouteCandidateColumns}
                data={storeRouteCandidates?.items ?? []}
                emptyDescription="발주고코드 또는 지점명으로 검색해 주세요."
                emptyTitle="추가할 발주고/배송지가 없습니다."
                getRowKey={(item) => String(item.id)}
                renderMobileCard={(item) => {
                  const alreadyScoped = scopedStoreRouteIds.has(Number(item.id));
                  return (
                    <ScopeMobileCard
                      action={
                        <Button disabled={alreadyScoped || mutatingScope} onClick={() => addStoreRouteScope(item)} size="sm" variant={alreadyScoped ? 'secondary' : 'primary'}>
                          <Plus aria-hidden="true" size={14} />
                          {alreadyScoped ? '추가됨' : '추가'}
                        </Button>
                      }
                      code={<CodeCell value={item.baljugoCode} />}
                      details={[
                        { label: '거래처코드', value: <CodeCell value={item.customerCode ?? item.storeCode ?? ''} /> },
                        { label: '권역', value: item.area ?? '-' },
                      ]}
                      title={item.storeName ?? '-'}
                    />
                  );
                }}
              />
              <Pagination onPageChange={(nextPage) => setStoreRouteCandidatePage(nextPage - 1)} page={storeRouteCandidatePage + 1} total={storeRouteCandidates?.totalElements ?? 0} totalPages={Math.max(storeRouteCandidates?.totalPages ?? 0, 1)} />
            </ScopeSearchPanel>

            <ScopeListPanel count={storeRouteScopes?.totalElements ?? 0} title="현재 공개 발주고/배송지">
              <DataTable
                columns={storeRouteScopeColumns}
                data={storeRouteScopes?.items ?? []}
                emptyDescription="검색 결과에서 발주고/배송지를 공개 범위에 추가할 수 있습니다."
                emptyTitle="공개된 발주고/배송지가 없습니다."
                getRowKey={(item) => String(item.id)}
                renderMobileCard={(item) => (
                  <ScopeMobileCard
                    action={<ScopeRemoveButton disabled={mutatingScope} onClick={() => removeStoreRouteScope(item)} />}
                    code={<CodeCell value={item.storeRoute?.baljugoCode ?? ''} />}
                    details={[
                      { label: '거래처코드', value: <CodeCell value={item.storeRoute?.customerCode ?? ''} /> },
                      { label: '출처', value: scopeSourceLabel(item.source) },
                    ]}
                    title={item.storeRoute?.storeName ?? '-'}
                  />
                )}
              />
              <Pagination onPageChange={(nextPage) => setStoreRouteScopePage(nextPage - 1)} page={storeRouteScopePage + 1} total={storeRouteScopes?.totalElements ?? 0} totalPages={Math.max(storeRouteScopes?.totalPages ?? 0, 1)} />
            </ScopeListPanel>
          </div>
        )}
      </Card>
    </div>
  );
}

function ScopeSearchPanel({ children, left, onReset, onSearch, right, title }: { children: ReactNode; left: ReactNode; onReset: () => void; onSearch: () => void; right: ReactNode; title: string }) {
  return (
    <section className="min-w-0 space-y-4">
      <h4 className="text-sm font-bold text-slate-950">{title}</h4>
      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
        {left}
        {right}
        <Button onClick={onSearch} variant="primary"><Search aria-hidden="true" size={16} />검색</Button>
        <Button onClick={onReset}><RotateCcw aria-hidden="true" size={16} />초기화</Button>
      </div>
      {children}
    </section>
  );
}

function ScopeListPanel({ children, count, title }: { children: ReactNode; count: number; title: string }) {
  return (
    <section className="min-w-0 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-bold text-slate-950">{title}</h4>
        <Badge tone="teal">{count.toLocaleString()}건</Badge>
      </div>
      {children}
    </section>
  );
}

function ScopeRemoveButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return <Button disabled={disabled} onClick={onClick} size="sm"><Trash2 aria-hidden="true" size={14} />해제</Button>;
}

function ScopeMobileCard({
  action,
  code,
  details,
  title,
}: {
  action: ReactNode;
  code: ReactNode;
  details: Array<{ label: string; value: ReactNode }>;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {code}
          <p className="mt-1 truncate text-sm font-semibold text-slate-950">{title}</p>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
        {details.map((detail) => (
          <div className="min-w-0" key={detail.label}>
            <p className="font-semibold text-slate-400">{detail.label}</p>
            <div className="mt-1 min-w-0 truncate text-slate-700">{detail.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryPanel({ label, title, tone }: { label: string; title: string; tone: 'neutral' | 'teal' | 'amber' }) {
  return <Card className="p-4"><p className="text-xs font-semibold uppercase text-slate-500">{label}</p><div className="mt-3"><Badge tone={tone}>{title}</Badge></div></Card>;
}

function VisibilityToggle({ checked, disabled, label, onChange }: { checked: boolean; disabled?: boolean; label: string; onChange: (checked: boolean) => void }) {
  return (
    <label className={`flex min-h-12 items-center justify-between gap-3 rounded-md border border-slate-200 px-4 py-3 ${disabled ? 'bg-slate-50 text-slate-400' : 'bg-white text-slate-800'}`}>
      <span className="text-sm font-semibold">{label}</span>
      <input checked={checked} className="h-5 w-5 rounded border-slate-300 text-teal-700 focus:ring-teal-100" disabled={disabled} onChange={(event) => onChange(event.target.checked)} type="checkbox" />
    </label>
  );
}

function TabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return <button className={`h-10 rounded-md border px-4 text-sm font-semibold transition ${active ? 'border-teal-700 bg-teal-700 text-white' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`} onClick={onClick} type="button">{label}</button>;
}

function productVisibilityLabel(mode: ClientProductMasterVisibilityMode) {
  return mode === 'ALL_PRODUCTS' ? '전체 상품 공개' : '사용 범위 공개';
}

function storeRouteVisibilityLabel(mode: ClientStoreRouteMasterVisibilityMode) {
  return mode === 'ALL_STORE_ROUTES' ? '전체 발주고 공개' : '사용 범위 공개';
}

function scopeSourceLabel(source: string) {
  switch (source) {
    case 'USED_IN_BATCH':
      return '배치 사용';
    case 'UPLOADED_BATCH':
      return '업로드';
    case 'REQUEST_APPROVED':
      return '요청 승인';
    default:
      return '수동';
  }
}

function requireTenantId(tenantId: number | null) {
  if (!tenantId) throw new Error('tenantId가 필요합니다.');
  return tenantId;
}

function formatApiError(error: unknown) {
  if (error instanceof OmsApiError) return error.message;
  if (error instanceof Error) return error.message;
  return '요청 처리 중 오류가 발생했습니다.';
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}
