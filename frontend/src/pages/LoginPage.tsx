import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { OmsApiError } from '../api/client';
import { omsApi } from '../api/oms';
import { saveAuthSession } from '../app/auth';
import { Button, Card, Input } from '../components/common';

export function LoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!loginId.trim() || !password.trim()) {
      setErrorMessage('아이디와 비밀번호를 입력해 주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const response = await omsApi.auth.login({
        loginId: loginId.trim(),
        password,
      });
      saveAuthSession(response);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      setErrorMessage(loginErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_480px]">
        <section className="hidden border-r border-slate-200 bg-white px-10 py-12 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-700 text-sm font-bold text-white">
                OMS
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">OMS Logistics</p>
                <p className="text-xs text-slate-500">Tenant Operations Console</p>
              </div>
            </div>
            <div className="mt-20 max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">Operations</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight tracking-normal text-slate-950">
                업로드, 검증, 확정 업무를 한 화면 흐름으로 관리합니다.
              </h1>
              <p className="mt-5 max-w-lg text-sm leading-6 text-slate-600">
                OIS 엑셀 기반 운영 데이터를 확인하고 배치 상태, 검증 결과, API 제공 상태를 추적하는 OMS 관리자 화면입니다.
              </p>
            </div>
          </div>

          <p className="max-w-xl text-xs leading-5 text-slate-500">
            로그인 후 업로드, 배치 검증, 라벨 다운로드, 외부 API 제공 상태를 확인할 수 있습니다.
          </p>
        </section>

        <section className="flex items-center justify-center px-4 py-10 sm:px-6">
          <Card className="w-full max-w-[440px] p-6 sm:p-8">
            <div className="lg:hidden">
              <div className="mb-8 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-700 text-sm font-bold text-white">
                  OMS
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-950">OMS Logistics</p>
                  <p className="text-xs text-slate-500">Operations Console</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-2xl font-bold text-slate-950">로그인</p>
              <p className="mt-2 text-sm text-slate-500">계정 정보를 입력해 OMS에 접속합니다.</p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <Input
                autoComplete="username"
                disabled={isSubmitting}
                label="아이디"
                onChange={(event) => setLoginId(event.target.value)}
                placeholder="ops01"
                value={loginId}
              />

              <div>
                <div className="relative">
                  <Input
                    autoComplete="current-password"
                    className="pr-20"
                    disabled={isSubmitting}
                    label="비밀번호"
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="비밀번호"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                  />
                  <button
                    className="absolute bottom-0 right-0 h-10 px-3 text-xs font-semibold text-slate-500 transition hover:text-teal-700"
                    disabled={isSubmitting}
                    onClick={() => setShowPassword((current) => !current)}
                    type="button"
                  >
                    {showPassword ? '숨김' : '표시'}
                  </button>
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {errorMessage}
                </div>
              ) : null}

              <div className="flex items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input className="h-4 w-4 rounded border-slate-300 text-teal-700 focus:ring-teal-600" type="checkbox" />
                  아이디 저장
                </label>
                <button className="text-sm font-semibold text-teal-700 hover:text-teal-800" type="button">
                  비밀번호 재설정
                </button>
              </div>

              <Button className="w-full" disabled={isSubmitting} type="submit" variant="primary">
                {isSubmitting ? '로그인 중' : '로그인'}
              </Button>
            </form>
          </Card>
        </section>
      </div>
    </main>
  );
}

function loginErrorMessage(error: unknown) {
  if (error instanceof OmsApiError) {
    const code = error.response.error?.code;
    if (code === 'INVALID_CREDENTIALS') {
      return '아이디 또는 비밀번호가 올바르지 않습니다.';
    }
    if (code === 'USER_DISABLED') {
      return '비활성화된 사용자입니다. 관리자에게 문의해 주세요.';
    }
    return error.response.error?.message ?? '로그인에 실패했습니다.';
  }

  return '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
}
