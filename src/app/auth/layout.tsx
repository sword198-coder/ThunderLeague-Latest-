import Image from "next/image";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-center min-h-[90vh] px-4 overflow-hidden">
      <Image src="/background.png" alt="" fill className="object-cover" priority />
      <div className="fixed inset-0 bg-[rgba(11,14,19,0.7)]" />
      <div className="relative z-10 w-full flex justify-center">
        {children}
      </div>
    </div>
  );
}
