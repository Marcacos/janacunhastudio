import type { Appointment } from "@/lib/api";

const STATUS_LABELS: Record<Appointment["status"], string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Valor em reais no formato do Excel brasileiro (ex.: 120,00). */
function reais(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/** Formata o WhatsApp como (48) 99999-9999; assim o Excel não vira notação científica. */
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

/** Escapa um campo para CSV com separador ponto e vírgula. */
function campo(value: string | number) {
  const s = String(value ?? "");
  return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Gera um CSV (abre direto no Excel/Google Planilhas) com cada atendimento do mês.
 * month = "AAAA-MM".
 */
export function buildMonthCsv(appointments: Appointment[], month: string) {
  const list = appointments
    .filter((a) => a.appointment_date.startsWith(month))
    .sort((a, b) =>
      `${a.appointment_date} ${a.start_time}`.localeCompare(`${b.appointment_date} ${b.start_time}`),
    );

  const header = [
    "Data",
    "Início",
    "Fim",
    "Cliente",
    "WhatsApp",
    "Serviços",
    "Duração (min)",
    "Valor (R$)",
    "Status",
    "Observações",
    "Agendado em",
  ];

  const rows = list.map((a) => [
    dataBR(a.appointment_date),
    a.start_time.slice(0, 5),
    a.end_time.slice(0, 5),
    a.customer_name,
    telefone(a.customer_whatsapp),
    (a.appointment_services ?? []).map((s) => s.service_name).join(" + "),
    a.total_duration_minutes,
    reais(a.total_price_cents),
    STATUS_LABELS[a.status],
    a.notes,
    new Date(a.created_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
  ]);

  const recebido = list.filter((a) => a.status === "concluido").reduce((s, a) => s + a.total_price_cents, 0);
  const previsto = list
    .filter((a) => a.status === "pendente" || a.status === "confirmado")
    .reduce((s, a) => s + a.total_price_cents, 0);
  const cancelados = list.filter((a) => a.status === "cancelado").length;

  const lines = [
    header,
    ...rows,
    [],
    ["", "", "", "", "", "", "Total de atendimentos", String(list.length - cancelados)],
    ["", "", "", "", "", "", "Total recebido (concluídos)", reais(recebido)],
    ["", "", "", "", "", "", "A receber (pendentes e confirmados)", reais(previsto)],
    ["", "", "", "", "", "", "Cancelados", String(cancelados)],
  ];

  // BOM + CRLF para o Excel reconhecer acentos e colunas.
  return "\uFEFF" + lines.map((l) => l.map(campo).join(";")).join("\r\n");
}

export function downloadFile(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
