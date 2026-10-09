import ExcelJS from "exceljs";

import type { Appointment } from "@/lib/api";

const STATUS_LABELS: Record<Appointment["status"], string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_COLORS: Record<Appointment["status"], string> = {
  pendente: "FFB45309",
  confirmado: "FF1D4ED8",
  concluido: "FF15803D",
  cancelado: "FFB91C1C",
};

const GOLD = "FFB08A3E";
const DARK = "FF2B2118";
const CREAM = "FFFAF6EF";
const LINE = "FFE5DCC8";

function telefone(raw: string) {
  let d = (raw || "").replace(/\D/g, "");
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return raw;
}

function dataBR(key: string) {
  const [y, m, d] = key.split("-");
  return `${d}/${m}/${y}`;
}

function monthLabel(month: string) {
  const name = new Date(`${month}-02T12:00:00`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: LINE } },
  bottom: { style: "thin", color: { argb: LINE } },
  left: { style: "thin", color: { argb: LINE } },
  right: { style: "thin", color: { argb: LINE } },
};

/**
 * Gera um .xlsx formatado com os atendimentos do mês (month = "AAAA-MM").
 */
export async function buildMonthXlsx(appointments: Appointment[], month: string): Promise<Blob> {
  const list = appointments
    .filter((a) => a.appointment_date.startsWith(month))
    .sort((a, b) =>
      `${a.appointment_date} ${a.start_time}`.localeCompare(`${b.appointment_date} ${b.start_time}`),
    );

  const wb = new ExcelJS.Workbook();
  wb.creator = "Janaína Cunha Studio";
  const ws = wb.addWorksheet("Atendimentos", { views: [{ state: "frozen", ySplit: 3 }] });

  ws.columns = [
    { width: 12 }, // Data
    { width: 8 }, // Início
    { width: 8 }, // Fim
    { width: 28 }, // Cliente
    { width: 18 }, // WhatsApp
    { width: 36 }, // Serviços
    { width: 12 }, // Duração
    { width: 14 }, // Valor
    { width: 13 }, // Status
    { width: 30 }, // Observações
  ];

  // Título
  ws.mergeCells("A1:J1");
  const title = ws.getCell("A1");
  title.value = `Janaína Cunha Studio — Atendimentos de ${monthLabel(month)}`;
  title.font = { name: "Georgia", size: 14, bold: true, color: { argb: DARK } };
  title.alignment = { vertical: "middle", horizontal: "left" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
  ws.getRow(1).height = 30;
  ws.getRow(2).height = 6;

  // Cabeçalho
  const headerRow = ws.getRow(3);
  headerRow.values = ["Data", "Início", "Fim", "Cliente", "WhatsApp", "Serviços", "Duração", "Valor", "Status", "Observações"];
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GOLD } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = thinBorder;
  });

  // Linhas de dados
  list.forEach((a, i) => {
    const row = ws.addRow([
      dataBR(a.appointment_date),
      a.start_time.slice(0, 5),
      a.end_time.slice(0, 5),
      a.customer_name,
      telefone(a.customer_whatsapp),
      (a.appointment_services ?? []).map((s) => s.service_name).join(" + "),
      a.total_duration_minutes,
      a.total_price_cents / 100,
      STATUS_LABELS[a.status],
      a.notes ?? "",
    ]);
    row.height = 18;
    const zebra = i % 2 === 1;
    row.eachCell((cell, col) => {
      cell.font = { name: "Arial", size: 10, color: { argb: DARK } };
      cell.border = thinBorder;
      cell.alignment = {
        vertical: "middle",
        horizontal: col === 4 || col === 6 || col === 10 ? "left" : "center",
        wrapText: col === 6 || col === 10,
      };
      if (zebra) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: CREAM } };
    });
    row.getCell(7).numFmt = '0 "min"';
    row.getCell(8).numFmt = 'R$ #.##0,00';
    row.getCell(9).font = { name: "Arial", size: 10, bold: true, color: { argb: STATUS_COLORS[a.status] } };
  });

  // Totais
  const recebido = list.filter((a) => a.status === "concluido").reduce((s, a) => s + a.total_price_cents, 0);
  const previsto = list
    .filter((a) => a.status === "pendente" || a.status === "confirmado")
    .reduce((s, a) => s + a.total_price_cents, 0);
  const cancelados = list.filter((a) => a.status === "cancelado").length;

  ws.addRow([]);
  const totals: Array<[string, number | string, boolean]> = [
    ["Total de atendimentos", list.length - cancelados, false],
    ["Total recebido (concluídos)", recebido / 100, true],
    ["A receber (pendentes e confirmados)", previsto / 100, true],
    ["Cancelados", cancelados, false],
  ];
  totals.forEach(([label, value, isMoney]) => {
    const row = ws.addRow([]);
    ws.mergeCells(`F${row.number}:I${row.number}`);
    const labelCell = row.getCell(6);
    labelCell.value = label;
    labelCell.font = { name: "Arial", size: 10, bold: true, color: { argb: DARK } };
    labelCell.alignment = { horizontal: "right", vertical: "middle" };
    const valueCell = row.getCell(10);
    valueCell.value = value;
    valueCell.font = { name: "Arial", size: 10, bold: true, color: { argb: GOLD } };
    valueCell.alignment = { horizontal: "left", vertical: "middle" };
    if (isMoney) valueCell.numFmt = 'R$ #.##0,00';
    row.height = 18;
  });

  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
