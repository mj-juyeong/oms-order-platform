import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, ModalFrame } from '../common';
import type { OrderLine } from '../../types/order';
import type {
  MasterRelatedBatch,
  MasterRelatedOrder,
  MasterRelatedValidationError,
  ClientPublicProductMasterDetail,
  ClientPublicProductMasterItem,
  ClientPublicStoreRouteMasterDetail,
  ClientPublicStoreRouteMasterItem,
  ProductMasterDetail,
  ProductMasterItem,
  StoreRouteMasterDetail,
  StoreRouteMasterItem,
} from '../../types/master';
import { BatchStatusBadge } from './BatchStatusBadge';
import { CodeCell } from './CodeCell';
import { OrderDetailModal } from './OrderDetailModal';

interface ProductMasterDetailModalProps {
  detail: ProductMasterDetail | null;
  error: string | null;
  fallbackItem: ProductMasterItem | null;
  loading: boolean;
  onClose: () => void;
}

interface StoreRouteMasterDetailModalProps {
  detail: StoreRouteMasterDetail | null;
  error: string | null;
  fallbackItem: StoreRouteMasterItem | null;
  loading: boolean;
  onClose: () => void;
}

interface ClientProductMasterDetailModalProps {
  detail: ClientPublicProductMasterDetail | null;
  error: string | null;
  fallbackItem: ClientPublicProductMasterItem | null;
  loading: boolean;
  onClose: () => void;
}

interface ClientStoreRouteMasterDetailModalProps {
  detail: ClientPublicStoreRouteMasterDetail | null;
  error: string | null;
  fallbackItem: ClientPublicStoreRouteMasterItem | null;
  loading: boolean;
  onClose: () => void;
}

export function ProductMasterDetailModal({ detail, error, fallbackItem, loading, onClose }: ProductMasterDetailModalProps) {
  const item = detail?.item ?? fallbackItem;
  if (!item) return null;

  return (
    <MasterDetailShell
      badges={
        <>
          <Badge tone={item.activeYn === false ? 'neutral' : 'green'}>{item.activeYn === false ? '중지' : '운영'}</Badge>
          <Badge tone="blue">상품</Badge>
        </>
      }
      error={error}
      loading={loading}
      onClose={onClose}
      subtitle={item.productName ?? '-'}
      title="상품 마스터 상세"
    >
      {detail ? (
        <>
          <SummaryHero
            code={<CodeCell value={item.ezadminCode} />}
            label="이지어드민 상품코드"
            name={item.productName ?? '-'}
            scopeLabel="내 공개"
            uploadText={formatUploadText(detail.lastUpload)}
            usage={detail.usage}
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <DetailSection title="상품 기본 정보">
              <DetailItem label="상품코드" value={<CodeCell value={item.ezadminCode} />} />
              <DetailItem label="상품명" value={item.productName ?? '-'} />
              <DetailItem label="거래처 상품코드" value={<CodeCell value={item.customerProductCode ?? ''} />} />
              <DetailItem label="출고단위" value={item.outboundUnit ?? '-'} />
              <DetailItem label="보관온도" value={item.temperatureType ?? item.storageTemperature ?? '-'} />
              <DetailItem label="박스입수량" value={formatNumber(item.boxQty, 3)} />
              <DetailItem label="CBM" value={formatNumber(item.cbm, 6)} />
              <DetailItem label="원본 rowNo" value={item.rowNo ?? '-'} />
            </DetailSection>
            <RecentBatches batches={detail.recentBatches} />
            <ValidationErrors errors={detail.validationErrors} />
          </div>
          <RecentOrders orders={detail.recentOrders} />
        </>
      ) : null}
    </MasterDetailShell>
  );
}

export function StoreRouteMasterDetailModal({ detail, error, fallbackItem, loading, onClose }: StoreRouteMasterDetailModalProps) {
  const item = detail?.item ?? fallbackItem;
  if (!item) return null;

  return (
    <MasterDetailShell
      badges={
        <>
          <Badge tone={item.activeYn === false ? 'neutral' : 'green'}>{item.activeYn === false ? '중지' : '운영'}</Badge>
          <Badge tone="teal">배송지/차량</Badge>
        </>
      }
      error={error}
      loading={loading}
      onClose={onClose}
      subtitle={item.storeName ?? item.brandName ?? '-'}
      title="배송지/차량 마스터 상세"
    >
      {detail ? (
        <>
          <SummaryHero
            code={<CodeCell value={item.baljugoCode} />}
            label="발주고코드"
            name={item.storeName ?? '-'}
            scopeLabel="내 공개"
            uploadText={formatUploadText(detail.lastUpload)}
            usage={detail.usage}
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <DetailSection title="배송지/차량 기본 정보">
              <DetailItem label="발주고코드" value={<CodeCell value={item.baljugoCode} />} />
              <DetailItem label="거래처코드" value={<CodeCell value={item.customerCode ?? item.storeCode ?? ''} />} />
              <DetailItem label="브랜드" value={item.brandName ?? '-'} />
              <DetailItem label="지점명" value={item.storeName ?? '-'} />
              <DetailItem label="권역" value={item.area ?? '-'} />
              <DetailItem label="배송요일" value={item.deliveryDay ?? '-'} />
              <DetailItem label="차수" value={item.deliveryRound ?? '-'} />
              <DetailItem label="차량명" value={item.vehicleName ?? '-'} />
              <DetailItem label="담당기사" value={item.driverName ?? '-'} />
              <DetailItem label="주소" value={item.address ?? '-'} />
            </DetailSection>
            <RecentBatches batches={detail.recentBatches} />
            <ValidationErrors errors={detail.validationErrors} />
          </div>
          <RecentOrders orders={detail.recentOrders} />
        </>
      ) : null}
    </MasterDetailShell>
  );
}

export function ClientProductMasterDetailModal({ detail, error, fallbackItem, loading, onClose }: ClientProductMasterDetailModalProps) {
  const item = detail?.item ?? fallbackItem;
  if (!item) return null;

  return (
    <MasterDetailShell
      badges={
        <>
          <Badge tone={item.activeYn === false ? 'neutral' : 'green'}>{item.activeYn === false ? '중지' : '운영'}</Badge>
          <Badge tone="blue">공개 상품</Badge>
        </>
      }
      error={error}
      loading={loading}
      onClose={onClose}
      subtitle={item.productName ?? '-'}
      title="공개 상품 마스터 상세"
    >
      {detail ? (
        <>
          <SummaryHero
            code={<CodeCell value={item.ezadminCode} />}
            label="이지어드민 상품코드"
            name={item.productName ?? '-'}
            uploadText={formatUploadText(detail.lastUpload)}
            usage={detail.usage}
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <DetailSection title="상품 기본 정보">
              <DetailItem label="상품코드" value={<CodeCell value={item.ezadminCode} />} />
              <DetailItem label="상품명" value={item.productName ?? '-'} />
              <DetailItem label="거래처 상품코드" value={<CodeCell value={item.customerProductCode ?? ''} />} />
              <DetailItem label="출고단위" value={item.outboundUnit ?? '-'} />
              <DetailItem label="보관온도" value={item.temperatureType ?? '-'} />
              <DetailItem label="박스입수량" value={formatNumber(item.boxQty, 3)} />
              <DetailItem label="CBM" value={formatNumber(item.cbm, 6)} />
            </DetailSection>
            <RecentBatches batches={detail.recentBatches} />
            <ValidationErrors errors={detail.validationErrors} />
          </div>
          <RecentOrders orders={detail.recentOrders} />
        </>
      ) : null}
    </MasterDetailShell>
  );
}

export function ClientStoreRouteMasterDetailModal({ detail, error, fallbackItem, loading, onClose }: ClientStoreRouteMasterDetailModalProps) {
  const item = detail?.item ?? fallbackItem;
  if (!item) return null;

  return (
    <MasterDetailShell
      badges={
        <>
          <Badge tone={item.activeYn === false ? 'neutral' : 'green'}>{item.activeYn === false ? '중지' : '운영'}</Badge>
          <Badge tone="teal">공개 배송지/차량</Badge>
          {item.internalFieldsVisible ? <Badge tone="amber">배송 정보 공개</Badge> : null}
        </>
      }
      error={error}
      loading={loading}
      onClose={onClose}
      subtitle={item.storeName ?? item.brandName ?? '-'}
      title="공개 배송지/차량 마스터 상세"
    >
      {detail ? (
        <>
          <SummaryHero
            code={<CodeCell value={item.baljugoCode} />}
            label="발주고코드"
            name={item.storeName ?? '-'}
            uploadText={formatUploadText(detail.lastUpload)}
            usage={detail.usage}
          />
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <DetailSection title="배송지/차량 기본 정보">
              <DetailItem label="발주고코드" value={<CodeCell value={item.baljugoCode} />} />
              <DetailItem label="거래처코드" value={<CodeCell value={item.customerCode ?? ''} />} />
              <DetailItem label="브랜드" value={item.brandName ?? '-'} />
              <DetailItem label="지점명" value={item.storeName ?? '-'} />
              <DetailItem label="권역" value={item.area ?? '-'} />
              <DetailItem label="배송요일" value={item.deliveryDay ?? '-'} />
              <DetailItem label="차수" value={item.deliveryRound ?? '-'} />
              <DetailItem label="차량명" value={item.vehicleName ?? '-'} />
              <DetailItem label="담당기사" value={item.driverName ?? '-'} />
              <DetailItem label="주소" value={item.address ?? '-'} />
            </DetailSection>
            <RecentBatches batches={detail.recentBatches} />
            <ValidationErrors errors={detail.validationErrors} />
          </div>
          <RecentOrders orders={detail.recentOrders} />
        </>
      ) : null}
    </MasterDetailShell>
  );
}

function MasterDetailShell({
  badges,
  children,
  error,
  loading,
  onClose,
  subtitle,
  title,
}: {
  badges: ReactNode;
  children: ReactNode;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <ModalFrame onClose={onClose} panelClassName="flex max-h-[92dvh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-slate-950">{title}</p>
            {badges}
          </div>
          <p className="mt-1 truncate text-sm text-slate-500">{subtitle}</p>
        </div>
        <Button aria-label={`${title} 닫기`} onClick={onClose} size="sm" variant="ghost">닫기</Button>
      </div>
      <div className="overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
        {loading ? (
          <div className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm font-semibold text-slate-900">마스터 상세를 조회하는 중입니다.</p>
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">{error}</div>
        ) : (
          children
        )}
        <div className="mt-5 flex justify-end">
          <Button onClick={onClose} variant="primary">확인</Button>
        </div>
      </div>
    </ModalFrame>
  );
}

function SummaryHero({
  code,
  label,
  name,
  scopeLabel = '공개 고객사',
  uploadText,
  usage,
}: {
  code: ReactNode;
  label: string;
  name: string;
  scopeLabel?: string;
  uploadText: string;
  usage: ProductMasterDetail['usage'];
}) {
  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-teal-800">{label}</p>
          <div className="mt-2">{code}</div>
          <p className="mt-3 break-words text-base font-bold text-slate-950">{name}</p>
          <p className="mt-1 text-sm text-teal-800">{uploadText}</p>
        </div>
        <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 xl:w-auto xl:min-w-[440px]">
          <SummaryPill label="주문" value={usage.orderCount} />
          <SummaryPill label="Scan" value={usage.scanLineCount} />
          <SummaryPill label="PL" value={usage.plLineCount} />
          <SummaryPill label="Label" value={usage.labelLineCount} />
          <SummaryPill label="검증 오류" value={usage.validationErrorCount} />
          <SummaryPill label={scopeLabel} value={usage.activeClientScopeCount} />
        </div>
      </div>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-teal-200 bg-white px-3 py-2">
      <p className="text-[11px] font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-base font-bold text-slate-950">{formatNumber(value)}</p>
    </div>
  );
}

function DetailSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-950">{title}</h3>
      <dl className="mt-3 grid gap-3 text-sm">{children}</dl>
    </section>
  );
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-slate-900">{value}</dd>
    </div>
  );
}

function RecentBatches({ batches }: { batches: MasterRelatedBatch[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-950">최근 사용 배치</h3>
      {batches.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">운영 주문/PL/Scan/Label에서 사용된 배치가 없습니다.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {batches.map((batch) => (
            <Link className="block rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50" key={batch.id} to={`/batches/${batch.id}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CodeCell value={batch.batchNo} />
                <BatchStatusBadge status={batch.status} />
              </div>
              <p className="mt-2 text-xs text-slate-500">고객사 {batch.clientId} · {formatDate(batch.deliveryDate)} · {formatDateTime(batch.uploadedAt)}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function RecentOrders({ orders }: { orders: MasterRelatedOrder[] }) {
  const [selectedOrder, setSelectedOrder] = useState<MasterRelatedOrder | null>(null);
  const orderDetail = useMemo(() => (selectedOrder ? mapMasterOrderToOrderDetail(selectedOrder) : null), [selectedOrder]);

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-950">관련 주문</h3>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">연결된 주문이 없습니다.</p>
      ) : (
        <>
        <div className="mt-3 space-y-2 sm:hidden">
          {orders.map((order) => (
            <button
              className="block w-full rounded-md border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-teal-200 hover:bg-teal-50/40"
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              type="button"
            >
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <CodeCell value={order.orderNo ?? ''} />
                  <p className="mt-2 truncate text-sm font-semibold text-slate-950" title={order.storeName ?? undefined}>{order.storeName ?? '-'}</p>
                  <p className="mt-1 truncate text-xs text-slate-500" title={order.productName ?? undefined}>{order.productName ?? '-'}</p>
                </div>
                <span className="shrink-0 font-mono text-sm font-bold text-teal-700">{formatNumber(order.orderQty, 3)}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500">
                <span>Batch #{order.batchId}</span>
                <span className="text-right">{formatDate(order.dueDate)}</span>
              </div>
            </button>
          ))}
        </div>
        <div className="mt-3 hidden overflow-x-auto sm:block">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-3 py-2">배치</th>
                <th className="px-3 py-2">주문번호</th>
                <th className="px-3 py-2">거래처</th>
                <th className="px-3 py-2">상품</th>
                <th className="px-3 py-2 text-right">수량</th>
                <th className="px-3 py-2">납기</th>
                <th className="px-3 py-2">차량/차수</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr className="cursor-pointer border-t border-slate-100 hover:bg-slate-50" key={order.id} onClick={() => setSelectedOrder(order)}>
                  <td className="px-3 py-2"><Link className="font-semibold text-teal-700 hover:underline" onClick={(event) => event.stopPropagation()} to={`/batches/${order.batchId}`}>{order.batchId}</Link></td>
                  <td className="px-3 py-2"><CodeCell value={order.orderNo ?? ''} /></td>
                  <td className="px-3 py-2">{order.storeName ?? '-'} <span className="text-slate-400">{order.storeCode ?? ''}</span></td>
                  <td className="px-3 py-2">{order.productName ?? '-'} <span className="text-slate-400">{order.productCode ?? ''}</span></td>
                  <td className="px-3 py-2 text-right font-semibold">{formatNumber(order.orderQty, 3)}</td>
                  <td className="px-3 py-2">{formatDate(order.dueDate)}</td>
                  <td className="px-3 py-2">{[order.vehicleName, order.deliveryRound].filter(Boolean).join(' / ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}
      <OrderDetailModal onClose={() => setSelectedOrder(null)} order={orderDetail} />
    </section>
  );
}

function mapMasterOrderToOrderDetail(order: MasterRelatedOrder): OrderLine {
  const unit = normalizeOrderUnit(order.unit);

  return {
    id: String(order.id),
    batchId: String(order.batchId),
    clientName: order.clientName?.trim() || '-',
    orderNo: order.orderNo ?? '',
    dueDate: order.dueDate ?? '',
    storeCode: order.storeCode ?? '',
    storeName: order.storeName ?? '',
    brandName: '',
    productCode: order.productCode ?? '',
    productName: order.productName ?? '',
    unit,
    orderQty: Number(order.orderQty ?? 0),
    vehicleName: order.vehicleName ?? '',
    deliveryRound: order.deliveryRound ?? '',
    area: order.area ?? '',
    sourcePlLineId: String(order.sourcePlLineId ?? ''),
    sourceSheetName: unit === 'BOX' ? 'PL_Box' : 'PL_EA',
    sourceRowNo: 0,
    storageTemperature: '-',
    batchStatus: order.batchStatus,
    confirmed: order.confirmed,
  };
}

function normalizeOrderUnit(value?: string | null): OrderLine['unit'] {
  return value?.toUpperCase() === 'BOX' ? 'BOX' : 'EA';
}

function ValidationErrors({ errors }: { errors: MasterRelatedValidationError[] }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold text-slate-950">검증 오류 이력</h3>
      {errors.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">연결된 검증 오류가 없습니다.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {errors.map((error) => (
            <div className="rounded-md border border-slate-200 px-3 py-2" key={error.id}>
              <div className="flex flex-wrap items-center gap-2">
                <SeverityBadge severity={error.severity} />
                <CodeCell value={error.errorCode} />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{error.message}</p>
              <p className="mt-1 text-xs text-slate-500">배치 {error.batchId} · {error.domain} · {error.sheetName ?? '-'} {error.rowNo ? `${error.rowNo}행` : ''}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SeverityBadge({ severity }: { severity: MasterRelatedValidationError['severity'] }) {
  const tone = severity === 'ERROR' ? 'red' : severity === 'WARNING' ? 'amber' : 'blue';
  const label = severity === 'ERROR' ? 'Error' : severity === 'WARNING' ? 'Warning' : 'Info';
  return <Badge tone={tone}>{label}</Badge>;
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function formatUploadText(upload?: ProductMasterDetail['lastUpload'] | null) {
  if (!upload) return '마스터 반영 이력 없음';
  const reflectedAt = upload.appliedAt ?? upload.uploadedAt;
  const prefix = upload.appliedAt ? '반영' : '업로드';
  return `${upload.fileName} · ${prefix} ${formatDateTime(reflectedAt)}`;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'short' }).format(date);
}

function formatNumber(value?: number | null, maximumFractionDigits = 0) {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('ko-KR', { maximumFractionDigits }).format(Number(value));
}
