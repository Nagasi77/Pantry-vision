import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import withAuth from "./app/middleware/withAuth"; 

export function mainMiddleware(req: NextRequest) {
  return NextResponse.next();
}

export default withAuth(mainMiddleware, [
  "/dashboard",
  "/inventori",
  "/sensor",
  "/scan",
  "/riwayat",
  "/profile",
]);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/inventori/:path*",
    "/sensor/:path*",
    "/scan/:path*",
    "/riwayat/:path*",
    "/profile/:path*",
  ],
};