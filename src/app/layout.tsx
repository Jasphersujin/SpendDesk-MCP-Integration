import "./globals.css";
export const metadata = {
  title: "SpendDesk",
  description: "Spend requests and approvals",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
