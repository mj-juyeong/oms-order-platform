import { Button, Card, Input } from '../components/common';

export function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <Card className="w-full max-w-md p-6">
        <p className="text-xl font-bold text-slate-950">OMS 로그인</p>
        <p className="mt-2 text-sm text-slate-500">계정 정보를 입력해 로그인합니다.</p>
        <div className="mt-6 space-y-4">
          <Input disabled label="아이디" placeholder="ops01" />
          <Input disabled label="비밀번호" placeholder="********" type="password" />
          <Button className="w-full" disabled variant="primary">
            로그인
          </Button>
        </div>
      </Card>
    </main>
  );
}
