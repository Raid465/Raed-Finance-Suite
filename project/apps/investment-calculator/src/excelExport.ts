// Excel report export (workbook layout plus a rendered growth chart image).
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { CURRENCY_CONFIG, calculateYearlyData } from './calculations';
import type { Currency, InvestmentInputs, Scenario, YearData } from './calculations';

export async function exportToExcel(
  data: YearData[],
  currency: Currency,
  inputs: InvestmentInputs,
  scenarios?: Scenario[]
): Promise<void> {
  const config = CURRENCY_CONFIG[currency];
  const sym = config.symbol;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'حاسبة الاستثمار';
  wb.created = new Date();

  // ─── Colors ───
  const DARK_BG = '0F172A';
  const CARD_BG = '1E293B';
  const HEADER_BG = '10B981';
  const WHITE = 'FFFFFF';
  const GRAY = '94A3B8';
  const BLUE = '3B82F6';
  const GREEN = '10B981';
  const AMBER = 'F59E0B';
  const PURPLE = '8B5CF6';

  const addSheet = (name: string, title: string, rows: YearData[]) => {
    const ws = wb.addWorksheet(name, {
      properties: { tabColor: { argb: GREEN } },
    });

    // Column widths
    ws.columns = [
      { width: 10 },
      { width: 22 },
      { width: 22 },
      { width: 22 },
      { width: 15 },
      { width: 22 },
    ];

    // Title row
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = title;
    titleCell.font = { name: 'Arial', size: 18, bold: true, color: { argb: WHITE } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(1).height = 45;

    // Info row
    ws.mergeCells('A2:F2');
    const infoCell = ws.getCell('A2');
    infoCell.value = `رأس المال: ${sym}${inputs.initialAmount.toLocaleString()}  |  الإيداع الشهري: ${sym}${inputs.monthlyDeposit.toLocaleString()}  |  العائد: ${inputs.annualRate}%  |  المدة: ${inputs.years} سنة`;
    infoCell.font = { name: 'Arial', size: 11, color: { argb: GRAY } };
    infoCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: DARK_BG } };
    infoCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(2).height = 30;

    // Empty row
    ws.getRow(3).height = 8;

    // Header row
    const headers = ['السنة', `المستثمر (${sym})`, `قيمة المحفظة (${sym})`, `الأرباح (${sym})`, 'النمو %', inputs.adjustForInflation ? `القيمة الحقيقية (${sym})` : ''];
    const headerRow = ws.addRow(headers);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: WHITE } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_BG } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: '059669' } },
      };
    });

    // Data rows
    rows.forEach((d, i) => {
      const rowData = [
        d.year,
        d.invested,
        d.portfolioValue,
        d.earnings,
        d.growthPercent / 100,
        d.realValue || '',
      ];
      const row = ws.addRow(rowData);
      row.height = 26;
      const isEven = i % 2 === 0;
      const bgColor = isEven ? CARD_BG : DARK_BG;

      row.eachCell((cell, colNumber) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { name: 'Arial', size: 10, color: { argb: WHITE } };
        cell.border = {
          bottom: { style: 'thin', color: { argb: '334155' } },
        };

        if (colNumber === 1) {
          cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
        } else if (colNumber === 2) {
          cell.font = { name: 'Arial', size: 10, color: { argb: BLUE } };
          cell.numFmt = `#,##0 "${sym}"`;
        } else if (colNumber === 3) {
          cell.font = { name: 'Arial', size: 10, color: { argb: GREEN } };
          cell.numFmt = `#,##0 "${sym}"`;
        } else if (colNumber === 4) {
          cell.font = { name: 'Arial', size: 10, color: { argb: AMBER } };
          cell.numFmt = `#,##0 "${sym}"`;
        } else if (colNumber === 5) {
          cell.font = { name: 'Arial', size: 10, color: { argb: PURPLE } };
          cell.numFmt = '0.00%';
        } else if (colNumber === 6) {
          cell.font = { name: 'Arial', size: 10, color: { argb: 'FB7185' } };
          cell.numFmt = `#,##0 "${sym}"`;
        }
      });
    });

    // Summary row
    const last = rows[rows.length - 1];
    if (last) {
      ws.addRow([]);
      const summaryRow = ws.addRow(['الإجمالي', last.invested, last.portfolioValue, last.earnings, last.growthPercent / 100, '']);
      summaryRow.height = 32;
      summaryRow.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 12, bold: true, color: { argb: WHITE } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '0D4F4F' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'medium', color: { argb: GREEN } },
          bottom: { style: 'medium', color: { argb: GREEN } },
        };
        if (colNumber >= 2 && colNumber <= 4) {
          cell.numFmt = `#,##0 "${sym}"`;
        } else if (colNumber === 5) {
          cell.numFmt = '0.00%';
        }
      });
    }

    // Add chart
    const chartStartRow = rows.length + 7;
    const imageId = wb.addImage({
      buffer: createChartImage(rows),
      extension: 'png',
    });
    ws.addImage(imageId, {
      tl: { col: 0, row: chartStartRow },
      ext: { width: 850, height: 330 },
    });

    // Freeze header
    ws.views = [{ state: 'frozen', ySplit: 4 }];
  };

  addSheet('الحاسبة', `تقرير الاستثمار — ${currency}`, data);

  if (scenarios) {
    scenarios.forEach((s) => {
      const scenarioData = calculateYearlyData(inputs, s.annualRate);
      addSheet(s.name, `${s.name} — عائد ${s.annualRate}%`, scenarioData);
    });
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `investment-report-${currency}.xlsx`);
}

export function createChartImage(data: YearData[]): ArrayBuffer {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 350;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0F172A';
  ctx.fillRect(0, 0, 900, 350);

  const padding = { top: 40, right: 30, bottom: 50, left: 80 };
  const chartW = 900 - padding.left - padding.right;
  const chartH = 350 - padding.top - padding.bottom;

  const maxVal = Math.max(...data.map((d) => d.portfolioValue));
  const yMax = Math.ceil(maxVal / 10000) * 10000 || 10000;

  const xScale = (i: number) => padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
  const yScale = (v: number) => padding.top + chartH - (v / yMax) * chartH;

  // Grid lines
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (i / 5) * chartH;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(900 - padding.right, y);
    ctx.stroke();

    const val = yMax - (i / 5) * yMax;
    ctx.fillStyle = '#64748B';
    ctx.font = '11px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`${(val / 1000).toFixed(0)}K`, padding.left - 10, y + 4);
  }

  // X-axis labels
  ctx.fillStyle = '#64748B';
  ctx.font = '11px Arial';
  ctx.textAlign = 'center';
  data.forEach((d, i) => {
    if (i % Math.max(1, Math.floor(data.length / 10)) === 0 || i === data.length - 1) {
      ctx.fillText(`Y${d.year}`, xScale(i), 350 - padding.bottom + 20);
    }
  });

  // Stacked area - Invested
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(0));
  data.forEach((d, i) => ctx.lineTo(xScale(i), yScale(d.invested)));
  ctx.lineTo(xScale(data.length - 1), yScale(0));
  ctx.closePath();
  ctx.fillStyle = 'rgba(59, 130, 246, 0.25)';
  ctx.fill();

  // Line - Invested
  ctx.beginPath();
  data.forEach((d, i) => {
    if (i === 0) ctx.moveTo(xScale(i), yScale(d.invested));
    else ctx.lineTo(xScale(i), yScale(d.invested));
  });
  ctx.strokeStyle = '#3B82F6';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Stacked area - Earnings
  ctx.beginPath();
  ctx.moveTo(xScale(0), yScale(data[0].invested));
  data.forEach((d, i) => ctx.lineTo(xScale(i), yScale(d.portfolioValue)));
  for (let i = data.length - 1; i >= 0; i--) {
    ctx.lineTo(xScale(i), yScale(data[i].invested));
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
  ctx.fill();

  // Line - Total
  ctx.beginPath();
  data.forEach((d, i) => {
    if (i === 0) ctx.moveTo(xScale(i), yScale(d.portfolioValue));
    else ctx.lineTo(xScale(i), yScale(d.portfolioValue));
  });
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Legend
  const legendY = 20;
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(padding.left, legendY, 14, 10);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '12px Arial';
  ctx.textAlign = 'left';
  ctx.fillText('المستثمر', padding.left + 20, legendY + 9);

  ctx.fillStyle = '#10B981';
  ctx.fillRect(padding.left + 100, legendY, 14, 10);
  ctx.fillStyle = '#CBD5E1';
  ctx.fillText('الإجمالي', padding.left + 120, legendY + 9);

  const base64 = canvas.toDataURL('image/png').split(';base64,')[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}
