import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/auth/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventori/:path*",
    "/sensor/:path*",
    "/scan/:path*",
    "/riwayat/:path*",
    "/profile/:path*",
    "/infos/:path*",
  ],
};