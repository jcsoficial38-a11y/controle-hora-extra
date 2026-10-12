import { OvertimeRecord } from '../types/overtime';
import { formatDateBr, formatHours, formatCurrency } from './storage';

export interface WhatsAppSummaryOptions {
  periodLabel: string;
  records: OvertimeRecord[];
  onlyPending?: boolean;
  targetEmployee?: string;
}

export function buildWhatsAppMessage(options: WhatsAppSummaryOptions): string {
  const { periodLabel, records, onlyPending, targetEmployee } = options;

  let filtered = [...records];
  if (targetEmployee && targetEmployee !== 'todos') {
    filtered = filtered.filter(r => r.employeeName === targetEmployee);
  }
  if (onlyPending) {
    filtered = filtered.filter(r => r.status === 'pendente');
  }

  const totalHours = filtered.reduce((acc, r) => acc + r.hours, 0);
  const paidHours = filtered.filter(r => r.status === 'pago').reduce((acc, r) => acc + r.hours, 0);
  const pendingHours = filtered.filter(r => r.status === 'pendente').reduce((acc, r) => acc + r.hours, 0);
  const totalValue = filtered.reduce((acc, r) => acc + ((r.ratePerHour || 0) * r.hours), 0);

  // Group by employee
  const employeeMap = new Map<string, { total: number; paid: number; pending: number }>();
  filtered.forEach(r => {
    const cur = employeeMap.get(r.employeeName) || { total: 0, paid: 0, pending: 0 };
    cur.total += r.hours;
    if (r.status === 'pago') cur.paid += r.hours;
    else cur.pending += r.hours;
    employeeMap.set(r.employeeName, cur);
  });

  const lines: string[] = [];

  lines.push(`⏱️ *CONTROLE DE HORA EXTRA (HE)*`);
  lines.push(`📋 *Relatório de Horas Extras*`);
  lines.push(`🗓️ *Período:* ${periodLabel}`);
  if (targetEmployee && targetEmployee !== 'todos') {
    lines.push(`👤 *Colaborador:* ${targetEmployee}`);
  }
  lines.push(`----------------------------------------`);
  lines.push(`📊 *RESUMO GERAL:*`);
  lines.push(`• *Total de Horas:* ${formatHours(totalHours)}`);
  lines.push(`• ✅ *Horas Pagas:* ${formatHours(paidHours)}`);
  lines.push(`• ⏳ *Horas Pendentes:* ${formatHours(pendingHours)}`);
  if (totalValue > 0) {
    lines.push(`• 💰 *Valor Total Estimado:* ${formatCurrency(totalValue)}`);
  }
  lines.push(`----------------------------------------`);

  if (employeeMap.size > 1 && (!targetEmployee || targetEmployee === 'todos')) {
    lines.push(`👥 *APURAÇÃO POR COLABORADOR:*`);
    employeeMap.forEach((val, name) => {
      const statusIcon = val.pending > 0 ? '⏳' : '✅';
      lines.push(`${statusIcon} *${name}*: ${formatHours(val.total)} (Pagas: ${formatHours(val.paid)} | Pend: ${formatHours(val.pending)})`);
    });
    lines.push(`----------------------------------------`);
  }

  // Lista dos lançamentos (máximo 15 para não estourar tamanho do chat)
  const displayRecords = filtered.slice(0, 15);
  lines.push(`📝 *LANÇAMENTOS (${displayRecords.length} de ${filtered.length}):*`);
  
  displayRecords.forEach(r => {
    const statusText = r.status === 'pago' ? '✅ Pago' : '🔴 Pendente';
    const reasonText = r.reason ? ` - _${r.reason}_` : '';
    lines.push(`• *${formatDateBr(r.date)}* | ${r.employeeName}: *${formatHours(r.hours)}* [${statusText}]${reasonText}`);
  });

  if (filtered.length > 15) {
    lines.push(`_... e mais ${filtered.length - 15} lançamento(s) no sistema._`);
  }

  lines.push(`----------------------------------------`);
  lines.push(`✨ _Gerado via Controle de Hora Extra (HE) PWA_`);

  return lines.join('\n');
}

export function openWhatsApp(phone: string | undefined, message: string): void {
  const encoded = encodeURIComponent(message);
  let cleanPhone = (phone || '').replace(/\D/g, '');
  
  // Se informou telefone brasileiro sem DDI (10 ou 11 dígitos), adiciona 55
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  const url = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank');
}
