export default function StatusPill({ status }) {
  const normalized = (status || '').toLowerCase();

  let style = 'bg-[#94A3B8]/15 text-[#3f4947] border-[#94A3B8]/30';
  let label = status || 'UNKNOWN';

  switch (normalized) {
    case 'resolved':
    case 'recovered':
    case 'active':
    case 'action_taken':
      style = 'bg-[#4C7A63]/15 text-[#4C7A63] border-[#4C7A63]/30 font-semibold';
      label = status.toUpperCase().replace(/_/g, ' ');
      break;
    case 'open':
    case 'detected':
    case 'diagnosing':
      style = 'bg-[#0b4f4a]/15 text-[#0b4f4a] border-[#0b4f4a]/30 font-semibold';
      label = status.toUpperCase();
      break;
    case 'needs_manual_diagnosis':
    case 'escalated':
      style = 'bg-[#C98A2B]/15 text-[#C98A2B] border-[#C98A2B]/30 font-semibold';
      label = status === 'needs_manual_diagnosis' ? 'NEEDS MANUAL DIAGNOSIS' : 'ESCALATED';
      break;
    case 'failed':
    case 'written_off':
    case 'rate_limited':
    case 'disabled':
      style = 'bg-[#B23A2E]/15 text-[#B23A2E] border-[#B23A2E]/30 font-semibold';
      label = status.toUpperCase().replace(/_/g, ' ');
      break;
    default:
      style = 'bg-gray-100 text-gray-700 border-gray-300';
      label = status ? status.toUpperCase().replace(/_/g, ' ') : 'N/A';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono-data border tracking-wide uppercase ${style}`}>
      {label}
    </span>
  );
}
