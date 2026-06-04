import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, ModalFrame } from '../common';
import type { OrderLine } from '../../types/order';
import { BatchStatusBadge } from './BatchStatusBadge';
import { CodeCell } from './CodeCell';

export function OrderDetailModal({
	onBackToList,
	onClose,
	order,
}: {
	onBackToList?: () => void;
	onClose: () => void;
	order: OrderLine | null;
}) {
	if (!order) {
		return null;
	}

	return (
		<ModalFrame onClose={onClose} panelClassName="flex max-h-[84vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
			<div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-lg font-bold text-slate-950">주문 상세</p>
						<OrderBatchStatus order={order} />
						<Badge tone={order.unit === 'EA' ? 'blue' : 'teal'}>{order.unit}</Badge>
					</div>
				</div>
				<div className="flex shrink-0 flex-wrap gap-2">
					{onBackToList ? <Button onClick={onBackToList} size="sm" variant="secondary">주문 목록으로</Button> : null}
					<Button aria-label="주문 상세 닫기" onClick={onClose} size="sm" variant="ghost">닫기</Button>
				</div>
			</div>

			<div className="overflow-y-auto bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
				<div className="rounded-lg border border-slate-200 bg-white p-4">
					<p className="text-base font-bold text-slate-950">{order.productName || '-'}</p>
					<p className="mt-1 text-sm text-slate-600">{order.storeName || order.storeCode || '-'} · {order.orderQty.toLocaleString()} {order.unit}</p>
				</div>

				<div className="mt-4 grid gap-4 lg:grid-cols-2">
					<DetailSection title="주문 정보" description="주문과 배치 기준 정보">
						<DetailItem label="주문번호" value={<CodeCell value={order.orderNo} />} />
						<DetailItem label="고객사" value={order.clientName} />
						<DetailItem label="납기일" value={order.dueDate || '-'} />
						<DetailItem label="배치 ID" value={<CodeCell value={order.batchId} />} />
						<DetailItem label="PL 기준" value={<SourcePlCell order={order} />} />
					</DetailSection>

					<DetailSection title="품목/수량" description="출고할 품목과 주문 수량">
						<DetailItem label="품목코드" value={<CodeCell value={order.productCode} />} />
						<DetailItem label="품목명" value={order.productName || '-'} />
						<DetailItem label="브랜드" value={order.brandName || '-'} />
						<DetailItem label="주문수량" value={`${order.orderQty.toLocaleString()} ${order.unit}`} />
						<DetailItem label="보관온도" value={order.storageTemperature} />
					</DetailSection>

					<DetailSection title="거래처/배송" description="거래처와 배송 참고 정보">
						<DetailItem label="거래처코드" value={<CodeCell value={order.storeCode} />} />
						<DetailItem label="거래처명" value={order.storeName || '-'} />
						<DetailItem label="권역" value={order.area || '-'} />
						<DetailItem label="차량명" value={order.vehicleName || '-'} />
						<DetailItem label="차수" value={order.deliveryRound || '-'} />
					</DetailSection>
				</div>

				<div className="mt-5 flex flex-wrap justify-end gap-2">
					{onBackToList ? <Button onClick={onBackToList} variant="secondary">주문 목록으로</Button> : null}
					<Link className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" to={`/batches/${order.batchId}`}>
						배치 상세
					</Link>
					<Link className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" to="/pl-lines">
						PL 보기
					</Link>
					<Button onClick={onClose} variant="primary">확인</Button>
				</div>
			</div>
		</ModalFrame>
	);
}

function DetailSection({ children, description, title }: { children: ReactNode; description: string; title: string }) {
	return (
		<section className="rounded-lg border border-slate-200 bg-white">
			<div className="border-b border-slate-100 px-4 py-3">
				<p className="text-sm font-bold text-slate-950">{title}</p>
				<p className="mt-1 text-xs text-slate-500">{description}</p>
			</div>
			<dl className="grid gap-3 p-4 text-sm">{children}</dl>
		</section>
	);
}

function DetailItem({ label, value }: { label: string; value: ReactNode }) {
	return (
		<div className="grid grid-cols-[104px_minmax(0,1fr)] items-center gap-3 rounded-md border border-slate-200 bg-white p-4">
			<dt className="text-xs font-semibold text-slate-500">{label}</dt>
			<dd className="min-w-0 text-slate-900">{value}</dd>
		</div>
	);
}

function SourcePlCell({ order }: { order: OrderLine }) {
	return (
		<div className="flex items-center gap-2">
			<Badge tone={order.sourceSheetName === 'PL_EA' ? 'blue' : 'teal'}>{order.sourceSheetName}</Badge>
			<span className="text-xs text-slate-500">#{order.sourcePlLineId}</span>
		</div>
	);
}

function OrderBatchStatus({ order }: { order: OrderLine }) {
	if (order.batchStatus) {
		return <BatchStatusBadge status={order.batchStatus} />;
	}

	return <Badge tone={order.confirmed ? 'green' : 'neutral'}>{order.confirmed ? '확정' : '미확정'}</Badge>;
}
