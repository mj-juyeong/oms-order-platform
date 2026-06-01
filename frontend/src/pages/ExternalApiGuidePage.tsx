import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { EXTERNAL_API_BASE_URL } from '../api/client';
import { Badge, Button, Card } from '../components/common';
import { CodeCell } from '../components/domain';

const externalBaseUrl = stripTrailingSlash(EXTERNAL_API_BASE_URL);
const apiKeyPlaceholder = '발급받은_API_KEY';

type ExampleParam = {
  name: string;
  value: string;
  description: string;
};

type ApiExample = {
  title: string;
  description: string;
  params: ExampleParam[];
};

type RequestCondition = {
  label: string;
  parameter: string;
  location: string;
  example: string;
  description: string;
};

const apiServices = [
  {
    name: 'WOS Scan 데이터 조회',
    tag: 'WOS',
    scope: 'WOS_SCAN_READ',
    path: '/wos/scan-upload',
    description: 'WOS에서 스캔 업로드용 바코드 단위 데이터를 조회할 때 사용합니다.',
    dataset: 'Scan_upload_* 데이터',
    source: 'Scan_upload_장지, Scan_upload_군량리 등',
    querySummary: 'deliveryDate, scanCenter, storeCode, productCode, barcode, batchId, page, size',
    examples: [
      {
        title: '기본 조회',
        description: '제공 가능한 최신 확정 Scan 데이터를 20건 조회합니다.',
        params: [
          { name: 'size', value: '20', description: '한 번에 받을 데이터 건수' },
        ],
      },
      {
        title: '배송일 + 센터 조회',
        description: '배송일과 Scan_upload suffix 기준 센터를 지정합니다.',
        params: [
          { name: 'deliveryDate', value: '2026-05-29', description: '배송일자' },
          { name: 'scanCenter', value: '장지', description: 'Scan_upload suffix 기준 센터' },
          { name: 'size', value: '50', description: '한 번에 받을 데이터 건수' },
        ],
      },
      {
        title: '바코드 단건 확인',
        description: '운영자가 전달한 바코드가 API 제공 대상에 포함되는지 확인합니다.',
        params: [
          { name: 'barcode', value: '0000123456789', description: '확인할 바코드' },
          { name: 'size', value: '1', description: '단건 확인용 조회 건수' },
        ],
      },
    ],
  },
  {
    name: 'PL Picking List 조회',
    tag: 'PL',
    scope: 'PL_READ',
    path: '/pl/picking-list',
    description: '피킹 리스트 연동 시스템에서 출고 대상 PL 데이터를 조회할 때 사용합니다.',
    dataset: 'PL_EA, PL_Box 데이터',
    source: 'PL_EA, PL_Box',
    querySummary: 'deliveryDate, plType, vehicleName, deliveryRound, storeCode, orderNo, batchId, page, size',
    examples: [
      {
        title: 'EA 피킹 리스트',
        description: 'EA 단위 PL 데이터를 20건 조회합니다.',
        params: [
          { name: 'plType', value: 'EA', description: 'PL 데이터 유형' },
          { name: 'size', value: '20', description: '한 번에 받을 데이터 건수' },
        ],
      },
      {
        title: '배송일 + 차량 조회',
        description: '특정 배송일과 차량명 기준으로 PL 데이터를 조회합니다.',
        params: [
          { name: 'deliveryDate', value: '2026-05-29', description: '납기/배송일' },
          { name: 'vehicleName', value: '경기01', description: '차량명' },
          { name: 'size', value: '50', description: '한 번에 받을 데이터 건수' },
        ],
      },
      {
        title: '주문번호 조회',
        description: '연동 중 특정 주문번호의 PL 데이터를 재확인합니다.',
        params: [
          { name: 'orderNo', value: '0000000001', description: '조회할 주문번호' },
          { name: 'size', value: '20', description: '한 번에 받을 데이터 건수' },
        ],
      },
    ],
  },
];

const serviceInfo = [
  { label: '서비스 유형', value: 'REST API' },
  { label: '응답 형식', value: 'JSON' },
  { label: '인증 방식', value: 'X-Api-Key 헤더' },
  { label: '제공 대상', value: 'CONFIRMED 배치' },
];

const requestConditionGroups = [
  {
    title: '필수',
    tone: 'red' as const,
    description: '모든 외부 API 호출에 반드시 포함합니다.',
    items: [
      { label: 'API Key', parameter: 'X-Api-Key', location: 'Header', example: apiKeyPlaceholder, description: '발급받은 Key를 요청 헤더에 넣어 호출합니다.' },
    ],
  },
  {
    title: '권장',
    tone: 'green' as const,
    description: '대상 데이터를 좁히기 위해 우선 넣는 조건입니다.',
    items: [
      { label: '조회 일자', parameter: 'deliveryDate', location: 'Query', example: '2026-05-29', description: '배송일 또는 납기요청일 기준 조회 조건입니다.' },
    ],
  },
  {
    title: '공통 선택',
    tone: 'neutral' as const,
    description: 'WOS와 PL API에서 모두 사용할 수 있는 보조 조건입니다.',
    items: [
      { label: '목록 건수', parameter: 'size', location: 'Query', example: '20', description: '한 번에 받을 데이터 건수를 지정합니다. 기본값은 20건입니다.' },
      { label: '페이지 번호', parameter: 'page', location: 'Query', example: '0', description: '목록이 많을 때 다음 페이지를 조회합니다.' },
      { label: '배치 번호', parameter: 'batchId', location: 'Query', example: '1001', description: '특정 확정 배치만 조회할 때 사용합니다.' },
      { label: '거래처 코드', parameter: 'storeCode', location: 'Query', example: '000777', description: '특정 거래처 데이터만 조회할 때 사용합니다.' },
      { label: '품목 코드', parameter: 'productCode', location: 'Query', example: '001234', description: '특정 품목 데이터만 조회할 때 사용합니다.' },
    ],
  },
  {
    title: 'WOS 선택',
    tone: 'teal' as const,
    description: 'WOS Scan 데이터 조회에서만 의미가 있는 조건입니다.',
    items: [
      { label: '센터/거점', parameter: 'scanCenter', location: 'Query', example: '장지', description: 'WOS Scan 데이터에서 특정 Scan_upload suffix만 조회할 때 사용합니다.' },
      { label: '바코드', parameter: 'barcode', location: 'Query', example: '0000123456789', description: '특정 바코드 데이터를 확인할 때 사용합니다.' },
    ],
  },
  {
    title: 'PL 선택',
    tone: 'blue' as const,
    description: 'PL Picking List 조회에서만 의미가 있는 조건입니다.',
    items: [
      { label: 'PL 유형', parameter: 'plType', location: 'Query', example: 'EA', description: 'EA 또는 BOX 데이터만 구분해 조회할 때 사용합니다.' },
      { label: '차량명', parameter: 'vehicleName', location: 'Query', example: '경기01', description: '특정 차량 기준의 PL 데이터를 조회할 때 사용합니다.' },
      { label: '차수', parameter: 'deliveryRound', location: 'Query', example: '1차', description: '배송지/차량 마스터에서 보강된 차수 기준으로 조회합니다.' },
      { label: '주문번호', parameter: 'orderNo', location: 'Query', example: '0000000001', description: '특정 주문번호의 PL 데이터를 조회할 때 사용합니다.' },
    ],
  },
];

const statusCodes = [
  { code: '200', label: '정상', description: '요청이 정상 처리되었습니다.' },
  { code: '400', label: '요청 오류', description: '요청 조건이 올바르지 않거나 조회할 수 없는 배치입니다.' },
  { code: '401', label: '인증 실패', description: 'API Key가 없거나 유효하지 않습니다.' },
  { code: '403', label: '권한 없음', description: 'API Key에 필요한 조회 권한이 없습니다.' },
  { code: '404', label: '데이터 없음', description: '조회 가능한 확정 데이터가 없습니다.' },
];

const responseExample = `{
  "success": true,
  "data": {
    "items": [
      {
        "batchId": 1001,
        "deliveryDate": "2026-05-29",
        "storeCode": "000777",
        "productCode": "001234"
      }
    ],
    "page": 0,
    "size": 20,
    "totalElements": 436
  },
  "error": null,
  "meta": {
    "requestId": "req-20260529-000001",
    "timestamp": "2026-05-29T10:30:00+09:00"
  }
}`;

export function ExternalApiGuidePage() {
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="teal">외부 연동</Badge>
              <Badge tone="blue">API Key 인증</Badge>
            </div>
            <h2 className="mt-3 text-xl font-bold text-slate-950">물류 OMS 외부 API</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              WOS와 PL 연동 시스템에서 확정 완료된 운영 데이터를 조회하는 API입니다. 예시는 호출 도구별 코드 대신 요청 주소와 파라미터만 보여줍니다.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <GuideLinkButton to="/external-api/api-keys" variant="secondary">API Key 관리</GuideLinkButton>
            <GuideLinkButton to="/external-api/status" variant="primary">제공현황 보기</GuideLinkButton>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {serviceInfo.map((item) => (
          <Card className="p-4" key={item.label}>
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-base font-bold text-slate-950">{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-xs font-semibold text-slate-500">기본 주소</p>
        <div className="mt-2">
          <CopyableCode value={externalBaseUrl} />
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {apiServices.map((service) => (
          <Card className="overflow-hidden" key={service.path}>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-950">{service.name}</h2>
                <Badge tone={service.tag === 'WOS' ? 'teal' : 'blue'}>{service.tag}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">{service.description}</p>
            </div>
            <div className="space-y-4 p-5">
              <InfoRow label="요청 방식" value={<Badge tone="neutral">GET</Badge>} />
              <InfoRow label="요청 주소" value={<CopyableCode value={`${externalBaseUrl}${service.path}`} />} />
              <InfoRow label="인증 권한" value={<CodeCell maxWidthClass="max-w-full" truncate={false} value={service.scope} />} />
              <InfoRow label="제공 데이터" value={service.dataset} />
              <InfoRow label="원천 시트" value={service.source} />
              <InfoRow label="조회 조건" value={<span className="break-words text-slate-700">{service.querySummary}</span>} />
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                미확정 배치와 Error 검증 오류가 남은 배치는 응답 대상에서 제외됩니다.
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">요청 조건</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">필요한 조건만 선택해서 조회할 수 있습니다. 조건을 넣지 않으면 현재 제공 가능한 최신 확정 데이터 기준으로 조회됩니다.</p>
        </div>
        <RequestConditionGroups />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">응답 예시</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">모든 응답은 성공 여부, 데이터, 오류, 추적 메타 정보를 같은 구조로 반환합니다.</p>
          </div>
          <div className="p-5">
            <CodeExample label="JSON 응답 예시" value={responseExample} />
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-950">처리 결과 코드</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">연동 시스템에서는 HTTP 상태 코드와 응답 메시지로 처리 결과를 확인합니다.</p>
          </div>
          <GuideTable
            columns={['코드', '상태', '설명']}
            rows={statusCodes.map((item) => [item.code, item.label, item.description])}
          />
        </Card>
      </div>

      <div className="space-y-4">
        {apiServices.map((service) => (
          <Card className="overflow-hidden" key={`${service.path}-examples`}>
            <div className="border-b border-slate-100 px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-950">{service.name} 호출 예시</h2>
                <Badge tone={service.tag === 'WOS' ? 'teal' : 'blue'}>{service.tag}</Badge>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">필요한 예시만 펼쳐서 요청 주소와 파라미터를 확인합니다. 한글 값은 복사용 주소에서 URL 인코딩됩니다.</p>
            </div>
            <div className="space-y-4 p-5">
              <div className="space-y-3">
                {service.examples.map((example) => (
                  <RequestExample key={example.title} example={example} path={service.path} />
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function RequestConditionGroups() {
  return (
    <div className="space-y-4 p-5">
      {requestConditionGroups.map((group) => (
        <div className="overflow-hidden rounded-lg border border-slate-200" key={group.title}>
          <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge tone={group.tone}>{group.title}</Badge>
              <p className="text-sm font-semibold text-slate-900">{group.description}</p>
            </div>
            <p className="text-xs font-semibold text-slate-500">{group.items.length}개 조건</p>
          </div>
          <ConditionTable items={group.items} />
        </div>
      ))}
    </div>
  );
}

function ConditionTable({ items }: { items: RequestCondition[] }) {
  return (
    <GuideTable
      codeColumns={[1, 3]}
      columns={['항목', '파라미터명', '위치', '예시', '설명']}
      rows={items.map((item) => [item.label, item.parameter, item.location, item.example, item.description])}
    />
  );
}

function RequestExample({ example, path }: { example: ApiExample; path: string }) {
  const url = buildExampleUrl(path, example.params);

  return (
    <details className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 transition hover:bg-slate-100">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-950">{example.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{example.description}</p>
        </div>
        <span className="shrink-0 text-xs font-semibold text-slate-500 group-open:hidden">펼치기</span>
        <span className="hidden shrink-0 text-xs font-semibold text-slate-500 group-open:inline">접기</span>
      </summary>
      <div className="border-t border-slate-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[120px_minmax(0,1fr)]">
          <p className="text-xs font-semibold text-slate-500">요청 방식</p>
          <div><Badge tone="neutral">GET</Badge></div>
          <p className="text-xs font-semibold text-slate-500">요청 주소</p>
          <CopyableCode value={url} />
          <p className="text-xs font-semibold text-slate-500">인증 헤더</p>
          <CopyableCode value={`X-Api-Key: ${apiKeyPlaceholder}`} />
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">파라미터</th>
                <th className="px-4 py-3">값</th>
                <th className="px-4 py-3">설명</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {example.params.map((param) => (
                <tr key={param.name}>
                  <td className="px-4 py-3"><CodeCell value={param.name} /></td>
                  <td className="px-4 py-3"><CodeCell maxWidthClass="max-w-[240px]" value={param.value} /></td>
                  <td className="px-4 py-3 text-slate-600">{param.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)]">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <div className="min-w-0 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function CopyableCode({ value }: { value: string }) {
  return (
    <div className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <CodeCell className="flex-1 border-0 bg-transparent px-0 py-0" maxWidthClass="max-w-full" truncate={false} value={value} wrap />
      <CopyButton value={value} />
    </div>
  );
}

function CodeExample({ label, value }: { label: string; value: string }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200">
      <div className="flex items-center justify-between gap-3 bg-slate-900 px-4 py-3">
        <p className="text-xs font-semibold text-slate-200">{label}</p>
        <CopyButton dark value={value} />
      </div>
      <pre className="max-h-[360px] overflow-auto bg-slate-950 p-4 text-xs leading-6 text-slate-100">
        <code className="whitespace-pre-wrap break-all">{value}</code>
      </pre>
    </div>
  );
}

function CopyButton({ dark = false, value }: { dark?: boolean; value: string }) {
  return (
    <Button
      className={dark ? 'border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700' : 'shrink-0'}
      onClick={(event) => {
        event.stopPropagation();
        void navigator.clipboard?.writeText(value);
      }}
      size="sm"
      variant={dark ? 'ghost' : 'secondary'}
    >
      복사
    </Button>
  );
}

function GuideTable({ codeColumns = [], columns, rows }: { codeColumns?: number[]; columns: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            {columns.map((column) => (
              <th className="px-5 py-3" key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {rows.map((row) => (
            <tr key={row.join('-')}>
              {row.map((cell, index) => (
                <td className={`px-5 py-3 ${index === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'}`} key={`${row[0]}-${cell}`}>
                  {codeColumns.includes(index) ? <CodeCell maxWidthClass="max-w-[280px]" value={cell} /> : cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GuideLinkButton({
  children,
  to,
  variant,
}: {
  children: ReactNode;
  to: string;
  variant: 'primary' | 'secondary';
}) {
  const classes =
    variant === 'primary'
      ? 'border-teal-700 bg-teal-700 text-white hover:bg-teal-800'
      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50';

  return (
    <Link className={`inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-semibold transition ${classes}`} to={to}>
      {children}
    </Link>
  );
}

function buildExampleUrl(path: string, params: ExampleParam[]) {
  const query = new URLSearchParams(params.map((param) => [param.name, param.value]));
  return `${externalBaseUrl}${path}?${query.toString()}`;
}

function stripTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
