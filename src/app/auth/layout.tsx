export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-center min-h-[90vh] px-4 bg-cover bg-center"
      style={{ backgroundImage: "url(/background.png)" }}
    >
      <div className="fixed inset-0 bg-[rgba(11,14,19,0.7)]" />
      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </div>
  );
}
