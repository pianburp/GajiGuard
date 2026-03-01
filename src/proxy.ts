import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // Non-authenticated users can view the empty dashboard,
  // auth is handled at the component/action level.
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};

