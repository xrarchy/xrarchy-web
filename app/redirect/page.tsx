"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function RedirectPage() {
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