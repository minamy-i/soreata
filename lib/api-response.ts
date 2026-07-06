import { NextResponse } from 'next/server';

// APIルート共通のエラーレスポンス（未ログイン・権限なし）
export function unauthorized() {
  return NextResponse.json({ error: 'ログインが必要です' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: '権限がありません' }, { status: 403 });
}
