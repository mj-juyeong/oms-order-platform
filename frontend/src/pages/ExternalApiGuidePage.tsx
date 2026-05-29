import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { EXTERNAL_API_BASE_URL } from '../api/client';
import { Badge, Card } from '../components/common';
import { CodeCell } from '../components/domain';

const externalBaseUrl = stripTrailingSlash(EXTERNAL_API_BASE_URL);

const apiServices = [
  {
    name: 'WOS Scan 데이터 조회',
    tag: 'WOS',
    scope: 'WOS_SCAN_READ',
    path: '/wos/scan-upload',
    description: 'WOS에서 스캔 업로드용 바코드 단위 데이터를 조회할 때 사용합니다.',
    dataset: 'Scan_upload 계열 데이터',
    sample: `Invoke-RestMethod -Uri "${externalBaseUrl}/wos/scan-upload?size=20" -Headers @{ "X-Api-Key" = "발급받은_API_KEY" }`,
  },
  {
    name: 'PL Picking List 조회',
    tag: 'PL',
    scope: 'PL_READ',
    path: '/pl/picking-list',
    description: '피킹 리스트 연동 시스템에서 출고 대상 PL 데이터를 조회할 때 사용합니다.',
    dataset: 'PL_EA, PL_Box 데이터',
    sample: `Invoke-RestMethod -Uri "${externalBaseUrl}/pl/picking-list?size=20" -Headers @{ "X-Api-Key" = "발급받은_API_KEY" }`,
  },
];

const serviceInfo = [
  { label: '서비스 유형', value: 'REST API' },
  { label: '응답 형식', value: 'JSON' },
  { label: '인증 방식', value: 'X-Api-Key 헤더' },
  { label: '제공 대상', value: '확정 완료된 WOS/PL 데이터' },
];

const requestConditions = [
  { label: 'API Key', parameter: 'X-Api-Key', location: 'Header', required: '필수', example: '발급받은_API_KEY', description: '발급받은 Key를 요청 헤더에 넣어 호출합니다.' },
  { label: '목록 건수', parameter: 'size', location: 'Query', required: '선택', example: '20', description: '한 번에 받을 데이터 건수를 지정합니다. 기본값은 20건입니다.' },
  { label: '페이지 번호', parameter: 'page', location: 'Query', required: '선택', example: '0', description: '목록이 많을 때 다음 페이지를 조회합니다.' },
  { label: '배치 번호', parameter: 'batchId', location: 'Query', required: '선택', example: '1001', description: '특정 확정 배치만 조회할 때 사용합니다.' },
  { label: '조회 일자', parameter: 'deliveryDate', location: 'Query', required: '선택', example: '2026-05-29', description: '특정 일자의 제공 데이터를 조회할 때 사용합니다.' },
  { label: '센터/거점', parameter: 'scanCenter', location: 'Query', required: 'WOS 선택', example: '장지', description: 'WOS Scan 데이터에서 특정 센터나 거점만 조회할 때 사용합니다.' },
  { label: '바코드', parameter: 'barcode', location: 'Query', required: 'WOS 선택', example: '0000123456789', description: '특정 바코드 데이터를 확인할 때 사용합니다.' },
  { label: 'PL 유형', parameter: 'plType', location: 'Query', required: 'PL 선택', example: 'EA', description: 'EA 또는 BOX 데이터만 구분해 조회할 때 사용합니다.' },
  { label: '거래처 코드', parameter: 'storeCode', location: 'Query', required: '선택', example: '000777', description: '특정 거래처 데이터만 조회할 때 사용합니다.' },
  { label: '품목 코드', parameter: 'productCode', location: 'Query', required: '선택', example: '001234', description: '특정 품목 데이터만 조회할 때 사용합니다.' },
  { label: '주문번호', parameter: 'orderNo', location: 'Query', required: 'PL 선택', example: '0000000001', description: '특정 주문번호의 PL 데이터를 조회할 때 사용합니다.' },
];

const statusCodes = [
  { code: '200', label: '정상', description: '요청이 정상 처리되었습니다.' },
  { code: '401', label: '인증 실패', description: 'API Key가 없거나 유효하지 않습니다.' },
  { code: '403', label: '권한 없음', description: 'API Key에 필요한 조회 권한이 없습니다.' },
  { code: '404', label: '데이터 없음', description: '조회 가능한 확정 데이터가 없습니다.' },
  { code: '400', label: '요청 오류', description: '요청 조건이 올바르지 않거나 조회할 수 없는 배치입니다.' },
];

const quickExamples = [
  {
    title: 'WOS 기본 조회',
    command: `${externalBaseUrl}/wos/scan-upload?size=20`,
  },
  {
    title: 'WOS 센터/바코드 조회',
    command: `${externalBaseUrl}/wos/scan-upload?scanCenter=장지&barcode=0000123456789&size=20`,
  },
  {
    title: 'PL EA 조회',
    command: `${externalBaseUrl}/pl/picking-list?plType=EA&size=20`,
  },
  {
    title: 'PL 주문번호 조회',
    command: `${externalBaseUrl}/pl/picking-list?orderNo=0000000001&size=20`,
  },
];

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
              WOS와 PL 연동 시스템에서 OMS에 확정된 운영 데이터를 조회하기 위한 API입니다. 연동 담당자는 발급받은 API Key를 요청 헤더에 넣어 호출하면 됩니다.
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
              <InfoRow label="요청 주소" value={<CodeCell value={`${externalBaseUrl}${service.path}`} />} />
              <InfoRow label="인증 권한" value={<CodeCell value={service.scope} />} />
              <InfoRow label="제공 데이터" value={service.dataset} />
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-500">호출 예시</p>
                <pre className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  <code>{service.sample}</code>
                </pre>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">요청 조건</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">필요한 조건만 선택해서 조회할 수 있습니다. 조건을 넣지 않으면 현재 제공 가능한 최신 데이터 기준으로 조회됩니다.</p>
        </div>
        <GuideTable
          columns={['항목', '파라미터명', '위치', '필수 여부', '예시', '설명']}
          rows={requestConditions.map((item) => [item.label, item.parameter, item.location, item.required, item.example, item.description])}
          codeColumns={[1, 4]}
        />
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-950">요청 URL 예시</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">아래 주소에 API Key 헤더를 함께 넣어 호출합니다.</p>
        </div>
        <div className="grid gap-3 p-5 lg:grid-cols-2">
          {quickExamples.map((example) => (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" key={example.title}>
              <p className="mb-2 text-sm font-semibold text-slate-900">{example.title}</p>
              <CodeCell value={example.command} />
            </div>
          ))}
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
                  {codeColumns.includes(index) ? <CodeCell value={cell} /> : cell}
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

function stripTrailingSlash(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}
