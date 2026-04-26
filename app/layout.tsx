import "./globals.css"; // <-- ¡ESTA ES LA LÍNEA QUE DEVUELVE LA VIDA!
import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-950">
        {/* El Sidebar fijo a la izquierda */}
        <Sidebar />
        
        {/* El contenido principal (pages) a la derecha */}
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </body>
    </html>
  );
}