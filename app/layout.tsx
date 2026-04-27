import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";
import { ClerkProvider } from "@clerk/nextjs";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className="flex h-screen overflow-hidden bg-slate-950">
          <Toaster
            position="bottom-right"
            toastOptions={{ style: { background: "#1e293b", color: "#fff" } }}
          />{" "}
          <Sidebar />
          <main className="flex-1 overflow-hidden relative">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
