"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function RedirectContent() {
    const searchParams = useSearchParams();
    const link = searchParams.get("link");

    useEffect(() => {
        if (link) {
            const url = link.startsWith("http") ? link : `https://${link}`;
            window.location.href = url;
        }
    }, [link]);

    return <p>{link ? `Redirecting to ${link}...` : "No link provided."}</p>;
}

export default function RedirectPage() {
    return (
        <Suspense fallback={<p>Loading...</p>}>
            <RedirectContent />
        </Suspense>
    );
}