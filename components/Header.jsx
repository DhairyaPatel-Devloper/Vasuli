'use client';

export default function Header({ title = 'Dashboard', subtitle = 'Autonomous Payment Leak Recovery Engine' }) {
  return (
    <header className="bg-white border-b border-[#D8DEE2] px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-10 shadow-sm">
      <div>
        <h1 className="font-headline font-semibold text-xl text-[#1a1c1c] tracking-tight">{title}</h1>
        <p className="text-xs text-[#3f4947] mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Live Engine Status Indicator */}
        <div className="flex items-center gap-2 bg-[#f3f3f4] px-3 py-1.5 rounded border border-[#D8DEE2]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4C7A63] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4C7A63]"></span>
          </span>
          <span className="font-mono-data text-xs font-medium text-[#0b4f4a] tracking-wide uppercase">
            AGENT ENGINE: ACTIVE
          </span>
        </div>

        {/* Razorpay Test Mode Tag */}
        <div className="hidden sm:flex items-center gap-1.5 bg-[#C98A2B]/10 px-2.5 py-1 rounded text-xs font-mono-data text-[#C98A2B] border border-[#C98A2B]/30 font-medium">
          <span className="material-symbols-outlined text-sm">verified_user</span>
          <span>RAZORPAY TEST MODE</span>
        </div>
      </div>
    </header>
  );
}
