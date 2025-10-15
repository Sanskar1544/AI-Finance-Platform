import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/header";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Alvestor",
  description: "AI-driven insights for smarter investments.",
};

export default function RootLayout({ children }) {
  return (
     <ClerkProvider>
    <html lang="en">
      <body className={inter.className}>
        {/* header */}
        <  Header/>
        <main className="min-h-screen">{children}</main>
        <Toaster richColors />
        {/* footer */}
        <footer className="bg-blue-50 py-12 text-center text-gray-600">
          <div>
            <p>Made with ❤️ by Alvestor</p>
          </div>
        </footer>
      </body>
    </html>
    </ClerkProvider>
  );
}
