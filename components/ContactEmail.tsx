"use client";

import {useIsClient} from "@/hooks/useIsClient";

const EMAIL_USER = "admin";
const EMAIL_DOMAIN = "forcelabs.dev";

export default function ContactEmail() {
    const isClient = useIsClient();
    const address = `${EMAIL_USER}@${EMAIL_DOMAIN}`;

    if (!isClient) {
        return (
            <span>
                {EMAIL_USER} [at] {EMAIL_DOMAIN}
            </span>
        );
    }

    return <a href={`mailto:${address}`}>{address}</a>;
}
