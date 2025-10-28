import Link from "next/link";
import React from "react";
import {Metadata, Viewport} from "next";
import { SpeedInsights } from "@vercel/speed-insights/next"

import "../styles/style.css";

interface Props {
    children?: React.ReactNode;
}

export const metadata: Metadata = {
    title: 'ForceLabs » Wartungsarbeiten «',
    description: 'ForceLabs - grants you the force',
}

export const viewport: Viewport = {width: "device-width", initialScale: 1.0}

export default function Layout({children}: Props) {
    return (
        <html>
        <body>
        <div id="main">
            <header className="header-container">
                <div className="header">
                    <div className="header-item header-item__logo">
                        <div className="logo">
                            <Link href="/">
                                ForceLabs
                            </Link>
                        </div>
                        <div className="sublogo">
                            <Link href="/">
                                grants you the force.
                            </Link>
                        </div>
                    </div>

                    <div className="header-item header-pagetitle">
                        &raquo; Wartungsarbeiten &laquo;
                    </div>
                </div>
            </header>

            <div className="main-container">{children}</div>

            <footer className="footer-container">
                <div>
                    &copy; 2009 - {new Date().getFullYear()}{" "}
                    <Link href="/">
                        ForceLabs
                    </Link>{" "}
                    |{" "}
                    <Link href="/impressum">
                        Impressum
                    </Link>
                </div>
            </footer>
        </div>
        <SpeedInsights />
        </body>
        </html>
    );
};
