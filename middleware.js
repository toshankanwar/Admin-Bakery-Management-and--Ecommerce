// middleware.js
import { NextResponse } from "next/server";
import { auth } from "@/firebase/firebase";

export async function middleware(request) {
  const session = request.cookies.get("session");

  // Return to /login if session doesn't exist
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Verify session and check admin claim
    const decodedClaims = await auth.verifySessionCookie(session);
    const isAdmin = decodedClaims.admin === true;

    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
  } catch (error) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: "/admin/:path*",
};
