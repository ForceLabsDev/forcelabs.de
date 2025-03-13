import Head from "next/head";
import Link from "next/link";
import React from "react";

interface Props {
  children?: React.ReactNode;
}

export const Layout = ({ children }: Props) => {
  return (
    <>
      <Head>
        <title>ForceLabs &raquo;Wartungsarbeiten&laquo;</title>
        <meta httpEquiv="content-type" content="text/html; charset=utf-8" />
        <meta name="description" content="ForceLabs - grants you the force" />
        <meta name="viewport" content="width=device-width,initial-scale=1.0" />
      </Head>
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
    </>
  );
};
