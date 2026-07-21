import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddleware } from "@/lib/supabase-middleware";
import { unauthorized } from "@/lib/api-response";

// 認証不要な公開APIルート（各ルート内で個別に判断せず、ここで一括管理する）
const PUBLIC_API_PATHS = ["/api/decompose"];

// APIルートの2枚目の壁。各ルート内の認証チェック（requireApiUser）が万一壊れても、ここで未ログインを弾く
export async function proxy(request: NextRequest) {
  if (PUBLIC_API_PATHS.includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddleware(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
