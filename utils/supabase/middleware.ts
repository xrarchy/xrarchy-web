// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'

// export async function updateSession(request: NextRequest) {
//     let supabaseResponse = NextResponse.next({
//         request,
//     })

//     const supabase = createServerClient(
//         process.env.NEXT_PUBLIC_SUPABASE_URL!,
//         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//         {
//             cookies: {
//                 getAll() {
//                     return request.cookies.getAll()
//                 },
//                 setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
//                     cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
//                     supabaseResponse = NextResponse.next({
//                         request,
//                     })
//                     cookiesToSet.forEach(({ name, value, options }) =>
//                         supabaseResponse.cookies.set(name, value, options)
//                     )
//                 },
//             },
//         }
//     )

//     // IMPORTANT: Avoid writing any logic between createServerClient and
//     // supabase.auth.getUser(). A simple mistake could make it very hard to debug
//     // issues with users being randomly logged out.

//     const {
//         data: { user },
//     } = await supabase.auth.getUser()

//     console.log('🔒 Middleware: Auth check for', request.nextUrl.pathname, 'User:', user?.email || 'none');

//     // Skip authentication checks for confirmation routes
//     if (request.nextUrl.pathname.startsWith('/confirm') ||
//         request.nextUrl.pathname.startsWith('/api/auth/confirm')) {
//         console.log('🔒 Middleware: Skipping auth check for confirmation route');
//         return supabaseResponse;
//     }

//     if (
//         !user &&
//         !request.nextUrl.pathname.startsWith('/login') &&
//         !request.nextUrl.pathname.startsWith('/register') &&
//         !request.nextUrl.pathname.startsWith('/auth') &&
//         !request.nextUrl.pathname.startsWith('/api') &&
//         request.nextUrl.pathname !== '/'
//     ) {
//         // no user, potentially respond by redirecting the user to the login page
//         console.log('🔒 Middleware: Redirecting to login from', request.nextUrl.pathname);
//         const url = request.nextUrl.clone()
//         url.pathname = '/login'
//         return NextResponse.redirect(url)
//     }

//     // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
//     // creating a new response object with NextResponse.next() make sure to:
//     // 1. Pass the request in it, like so:
//     //    const myNewResponse = NextResponse.next({ request })
//     // 2. Copy over the cookies, like so:
//     //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
//     // 3. Change the myNewResponse object if needed, but avoid changing the cookies!
//     // 4. Finally:
//     //    return myNewResponse
//     // If this is not done, you may be causing the browser and server to go out
//     // of sync and terminate the user's session prematurely!

//     return supabaseResponse
// }



// utils/supabase/middleware.ts

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
    // Create a response instance (mutable)
    let response = NextResponse.next({ request });

    // Create Supabase client using request and response cookies
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
                    // ✅ Set cookies on the response ONLY
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // Get current user session
    const { data: { user }, error } = await supabase.auth.getUser();
    console.log(
        '🔒 Middleware: Auth check for',
        request.nextUrl.pathname,
        'User:',
        user?.email || 'none'
    );

    // Allow confirmation pages to pass without auth
    const allowedPaths = ['/login', '/register', '/auth', '/api', '/'];
    const isConfirmationRoute =
        request.nextUrl.pathname.startsWith('/confirm') ||
        request.nextUrl.pathname.startsWith('/api/auth/confirm');

    if (isConfirmationRoute) {
        console.log('🔒 Middleware: Skipping auth check for confirmation route');
        return response;
    }

    // Redirect if user is not authenticated and accessing protected route
    const isProtectedRoute = !allowedPaths.some((p) =>
        request.nextUrl.pathname.startsWith(p)
    );

    if (!user && isProtectedRoute) {
        console.log('🔒 Middleware: Redirecting to login from', request.nextUrl.pathname);
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    return response;
}
