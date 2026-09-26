import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";
import type { UserRole } from "@/types/database";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Refresh session — do not remove without understanding implications.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Helper to get role for the current user
  async function getUserRole(): Promise<UserRole | null> {
    if (!user) return null;
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    return (data as { role: UserRole } | null)?.role ?? null;
  }

  // Protect /driver/* — requires driver role
  // /driver/register is public (unauthenticated sign-up entry point — OQ-003)
  if (pathname.startsWith("/driver") && pathname !== "/driver/register") {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    const role = await getUserRole();
    if (role !== "driver") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Protect /admin/* — requires operator or super_admin role
  if (pathname.startsWith("/admin")) {
    if (!user) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
    const role = await getUserRole();
    if (role !== "operator" && role !== "super_admin") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname.startsWith("/auth") && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (manifest.json, icons, sw.js)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|.*\\.png$).*)",
  ],
};
