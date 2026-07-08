import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Asset Details",
  description: "View Asset Information",
};

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
