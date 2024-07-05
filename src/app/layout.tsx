"use client";

import { ThirdwebProvider } from "@thirdweb-dev/react";
import { PolygonAmoyTestnet } from "@thirdweb-dev/chains";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThirdwebProvider
          clientId={process.env.NEXT_PUBLIC_CLIENT_ID as string}
          activeChain={PolygonAmoyTestnet}
        >
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}
