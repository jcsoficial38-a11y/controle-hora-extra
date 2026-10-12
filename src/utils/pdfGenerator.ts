import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { OvertimeRecord } from '../types/overtime';
import { formatDateBr, formatHours, formatCurrency } from './storage';

export interface PDFExportOptions {
  monthName?: string;
  year?: number;
  records: OvertimeRecord[];
  filteredEmployee?: string;
  reportTitle?: string;
}

export function generateOvertimePDF(options: PDFExportOptions): void {
  const { monthName, year, records, filteredEmployee, reportTitle } = options;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryBlue = [30, 64, 175] as const; // #1e40af
  const secondaryBlue = [37, 99, 235] as const; // #2563eb
  const lightBg = [240, 246, 255] as const;

  // Header Banner
  doc.setFillColor(30, 64, 175);
  doc.rect(0, 0, 210, 26, 'F');

  // App Logo & Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CONTROLE DE HORA EXTRA (HE)', 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Relatório Oficial de Lançamentos e Apuração Mensal', 14, 21);

  // Issue date on header right
  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} às ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  doc.setFontSize(8);
  doc.text(`Emissão: ${dateFormatted}`, 196, 14, { align: 'right' });
  doc.text('Status: Documento Verificado', 196, 20, { align: 'right' });

  // Filter info box
  let startY = 32;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, startY, 182, 18, 2, 2, 'FD');

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const periodText = monthName && year ? `${monthName.toUpperCase()} / ${year}` : 'TODOS OS PERÍODOS';
  doc.text(`PERÍODO: ${periodText}`, 18, startY + 7);

  if (filteredEmployee && filteredEmployee !== 'todos') {
    doc.text(`COLABORADOR: ${filteredEmployee.toUpperCase()}`, 18, startY + 13);
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text(`TOTAL DE REGISTROS: ${records.length} lançamento(s)`, 18, startY + 13);
  }

  // Summary Metrics Cards
  const totalHours = records.reduce((acc, r) => acc + r.hours, 0);
  const paidHours = records.filter(r => r.status === 'pago').reduce((acc, r) => acc + r.hours, 0);
  const pendingHours = records.filter(r => r.status === 'pendente').reduce((acc, r) => acc + r.hours, 0);
  const totalValue = records.reduce((acc, r) => acc + ((r.ratePerHour || 0) * r.hours), 0);

  const metricsY = startY + 22;
  const cardWidth = 43;
  const cardHeight = 16;
  const gap = 3.3;

  const metrics = [
    { label: 'TOTAL DE HORAS', value: `${totalHours.toFixed(1)} hs`, bg: [239, 246, 255], border: [191, 219, 254], text: [29, 78, 216] },
    { label: 'HORAS PAGAS', value: `${paidHours.toFixed(1)} hs`, bg: [240, 253, 244], border: [187, 247, 208], text: [21, 128, 61] },
    { label: 'HORAS PENDENTES', value: `${pendingHours.toFixed(1)} hs`, bg: [254, 242, 242], border: [254, 202, 202], text: [185, 28, 28] },
    { label: 'VALOR ESTIMADO', value: totalValue > 0 ? formatCurrency(totalValue) : 'A Combinar', bg: [248, 250, 252], border: [226, 232, 240], text: [51, 65, 85] }
  ];

  metrics.forEach((m, idx) => {
    const x = 14 + idx * (cardWidth + gap);
    doc.setFillColor(m.bg[0], m.bg[1], m.bg[2]);
    doc.setDrawColor(m.border[0], m.border[1], m.border[2]);
    doc.roundedRect(x, metricsY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.label, x + cardWidth / 2, metricsY + 5.5, { align: 'center' });

    doc.setTextColor(m.text[0], m.text[1], m.text[2]);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(m.value, x + cardWidth / 2, metricsY + 12, { align: 'center' });
  });

  // Main Records Table
  const tableRows = records
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(r => {
      const isPaid = r.status === 'pago';
      return [
        formatDateBr(r.date),
        r.employeeName,
        formatHours(r.hours),
        r.overtimeType || '50%',
        r.reason || 'Serviço extraordinário',
        isPaid ? '[ PAGO ]' : '[ PENDENTE ]',
        r.ratePerHour ? formatCurrency(r.ratePerHour * r.hours) : '-'
      ];
    });

  autoTable(doc, {
    startY: metricsY + cardHeight + 6,
    head: [['DATA', 'FUNCIONÁRIO', 'HORAS', 'TIPO', 'MOTIVO / DESCRIÇÃO', 'STATUS', 'VALOR']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      valign: 'middle',
      font: 'helvetica',
      lineColor: [226, 232, 240],
      lineWidth: 0.1,
    },
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 22, halign: 'center' },
      1: { cellWidth: 38, fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
      3: { cellWidth: 14, halign: 'center' },
      4: { cellWidth: 50 },
      5: { cellWidth: 24, halign: 'center', fontStyle: 'bold' },
      6: { cellWidth: 16, halign: 'right' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === '[ PAGO ]') {
          data.cell.styles.textColor = [22, 101, 52]; // green
          data.cell.styles.fillColor = [240, 253, 244];
        } else {
          data.cell.styles.textColor = [185, 28, 28]; // red
          data.cell.styles.fillColor = [254, 242, 242];
        }
      }
    }
  });

  // Summary per Employee table
  // Group records by employee
  const employeeMap = new Map<string, { total: number; paid: number; pending: number }>();
  records.forEach(r => {
    const cur = employeeMap.get(r.employeeName) || { total: 0, paid: 0, pending: 0 };
    cur.total += r.hours;
    if (r.status === 'pago') cur.paid += r.hours;
    else cur.pending += r.hours;
    employeeMap.set(r.employeeName, cur);
  });

  const employeeSummaryRows: string[][] = [];
  employeeMap.forEach((val, name) => {
    employeeSummaryRows.push([
      name,
      `${val.total.toFixed(1)} hs`,
      `${val.paid.toFixed(1)} hs`,
      `${val.pending.toFixed(1)} hs`,
      val.pending === 0 ? 'Quitado' : 'A Compensar'
    ]);
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Check if we need a new page for the employee summary and signatures
  if (finalY > 220) {
    doc.addPage();
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO CONSOLIDADO POR COLABORADOR', 14, 20);

    autoTable(doc, {
      startY: 24,
      head: [['COLABORADOR', 'TOTAL HORAS', 'HORAS PAGAS', 'SALDO PENDENTE', 'SITUAÇÃO']],
      body: employeeSummaryRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
  } else {
    doc.setTextColor(30, 64, 175);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO CONSOLIDADO POR COLABORADOR', 14, finalY);

    autoTable(doc, {
      startY: finalY + 4,
      head: [['COLABORADOR', 'TOTAL HORAS', 'HORAS PAGAS', 'SALDO PENDENTE', 'SITUAÇÃO']],
      body: employeeSummaryRows,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 8, cellPadding: 2 },
    });
  }

  // Signature Block
  const sigPageY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16;
  const pageHeight = doc.internal.pageSize.getHeight();
  
  let sigY = sigPageY;
  if (sigY + 25 > pageHeight) {
    doc.addPage();
    sigY = 30;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  // Line 1: Gestor
  doc.line(20, sigY + 12, 90, sigY + 12);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Gestor / Coordenação Responsável', 55, sigY + 17, { align: 'center' });

  // Line 2: RH / Financeiro
  doc.line(120, sigY + 12, 190, sigY + 12);
  doc.text('Departamento de Recursos Humanos', 155, sigY + 17, { align: 'center' });

  // Footer page number
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(`Página ${i} de ${totalPages} • Controle de Hora Extra (HE) • Gerado automaticamente`, 105, 290, { align: 'center' });
  }

  // Output filename
  const cleanTitle = (reportTitle || 'relatorio-horas-extras').toLowerCase().replace(/\s+/g, '-');
  doc.save(`${cleanTitle}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
