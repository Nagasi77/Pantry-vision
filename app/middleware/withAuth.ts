import { getToken } from "next-auth/jwt";
import { NextFetchEvent, NextMiddleware, NextRequest, NextResponse } from "next/server";

const hanyaAdmin = ["/admin"];

export default function withAuth(
  middleware: NextMiddleware,
  requireAuth: string[] = []
) {
  return async (req: NextRequest, next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;
    
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    // Cek apakah halaman yang diakses ada di daftar requireAuth
    const isPageProtected = requireAuth.some((path) => pathname.startsWith(path));

    if (isPageProtected) {
      if (!token) {
        const url = new URL("/auth/login", req.url);
        url.searchParams.set("callbackUrl", encodeURI(req.url));
        return NextResponse.redirect(url);
      }
      
      // Proteksi khusus Admin
      if (token.role !== "admin" && hanyaAdmin.includes(pathname)) {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
    
    return middleware(req, next);
  };
}