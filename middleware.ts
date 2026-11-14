import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const isProtectedPath = (pathname: string) =>
  pathname === "/dashboard" ||
  pathname.startsWith("/dashboard/") ||
  pathname === "/admin" ||
  pathname.startsWith("/admin/");

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;
  const protectedPath = isProtectedPath(pathname);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  // Protected pages must fail closed if the auth client cannot be configured.
  if (!url || !key) {
    if (protectedPath) {
      return new NextResponse("Authentication service is not configured.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (protectedPath && (error || !user)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      const redirect = NextResponse.redirect(loginUrl);
      // Preserve any refreshed/rotated Supabase cookies on the redirect.
      response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
      return redirect;
    }
  } catch {
    if (protectedPath) {
      return new NextResponse("Authentication could not be verified. Please retry.", {
        status: 503,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};