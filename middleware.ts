import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPortalAuth = path === '/portal/login' || path === '/portal/register'
  const isPublic = path === '/login' || isPortalAuth || path.startsWith('/auth')

  if (!user && !isPublic) {
    // Send unauthenticated portal visitors to the customer login.
    const target = path.startsWith('/portal') ? '/portal/login' : '/login'
    return NextResponse.redirect(new URL(target, request.url))
  }

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const role = profile?.role ?? 'customer'
    const homePath = role === 'customer' ? '/portal' : '/admin'

    // Already signed in: keep users out of the auth screens.
    if (path === '/login' || path === '/' || isPortalAuth) {
      return NextResponse.redirect(new URL(homePath, request.url))
    }
    if (path.startsWith('/admin') && role === 'customer') {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
    if (path.startsWith('/portal') && role !== 'customer') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
