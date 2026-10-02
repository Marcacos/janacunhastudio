import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Appointment, appointmentsQuery } from "@/lib/api";
import { buildMonthCsv, downloadFile } from "@/lib/export";
import { formatDateShort, formatPrice, fromDateKey, toDateKey, todayKey } from "@/lib/format";

/** Segunda a domingo da semana que contém a data (AAAA-MM-DD). */
function weekRange(key: string) {
  const d = fromDateKey(key);
  const offset = (d.getDay() + 6) % 7; // segunda = 0
  const start = new Date(d);
  start.setDate(d.getDate() - offset);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: toDateKey(start), end: toDateKey(end) };
}

type Totals = { count: number; received: number; expected: number };

function totalsFor(list: Appointment[]): Totals {
  const active = list.filter((a) => a.status !== "cancelado");
  return {
    count: active.length,
    received: list.filter((a) => a.status === "concluido").reduce((s, a) => s + a.total_price_cents, 0),
    expected: list
      .filter((a) => a.status === "pendente" || a.status === "confirmado")
      .reduce((s, a) => s + a.total_price_cents, 0),
  };
}

export function DashboardTab() {
  const { data: appointments, isLoading } = useQuery(appointmentsQuery());
  const today = todayKey();
  const [exportMonth, setExportMonth] = useState(today.slice(0, 7));

  const { day, week, month, weekLabel, monthStatus } = useMemo(() => {
    const list = appointments ?? [];
    const range = weekRange(today);
    const monthList = list.filter((a) => a.appointment_date.startsWith(today.slice(0, 7)));
    return {
      day: totalsFor(list.filter((a) => a.appointment_date === today)),
      week: totalsFor(list.filter((a) => a.appointment_date >= range.start && a.appointment_date <= range.end)),
      month: totalsFor(monthList),
      weekLabel: `${formatDateShort(range.start)} a ${formatDateShort(range.end)}`,
      monthStatus: {
        concluido: monthList.filter((a) => a.status === "concluido").length,
        aberto: monthList.filter((a) => a.status === "pendente" || a.status === "confirmado").length,
        cancelado: monthList.filter((a) => a.status === "cancelado").length,
      },
    };
  }, [appointments, today]);

  function exportCsv() {
    const list = appointments ?? [];
    const inMonth = list.filter((a) => a.appointment_date.startsWith(exportMonth));
    if (inMonth.length === 0) {
      toast.error("Não há atendimentos neste mês.");
      return;
    }
    downloadFile(`atendimentos-${exportMonth}.csv`, buildMonthCsv(list, exportMonth));
    toast.success("Planilha baixada.");
  }

  if (isLoading) return <p className="text-base text-muted-foreground">Carregando métricas…</p>;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl">Resumo financeiro</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          “Recebido” soma os atendimentos marcados como <strong>Concluído</strong>. “A receber” soma os pendentes e
          confirmados. Cancelados não entram na conta.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard title="Hoje" subtitle={formatDateShort(today)} totals={day} />
          <MetricCard title="Esta semana" subtitle={weekLabel} totals={week} />
          <MetricCard title="Este mês" subtitle={monthName(today)} totals={month} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <MiniStat label="Concluídos no mês" value={monthStatus.concluido} />
        <MiniStat label="Pendentes / confirmados no mês" value={monthStatus.aberto} />
        <MiniStat label="Cancelados no mês" value={monthStatus.cancelado} />
      </section>

      <section className="border border-border bg-card p-6">
        <h2 className="text-2xl">Baixar atendimentos do mês</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Gera uma planilha (CSV, abre no Excel e no Google Planilhas) com cada atendimento: data, horário, cliente,
          WhatsApp, serviços, valor e status, mais os totais no final.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="export-month" className="text-xs">
              Mês
            </Label>
            <Input
              id="export-month"
              type="month"
              value={exportMonth}
              onChange={(e) => setExportMonth(e.target.value)}
              className="mt-1 rounded-none"
            />
          </div>
          <Button className="rounded-none" onClick={exportCsv} disabled={!exportMonth}>
            <Download className="mr-2 size-4" /> Baixar planilha
          </Button>
        </div>
      </section>
    </div>
  );
}

function monthName(key: string) {
  const name = fromDateKey(`${key.slice(0, 7)}-01`).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function MetricCard({ title, subtitle, totals }: { title: string; subtitle: string; totals: Totals }) {
  return (
    <div className="border border-border bg-card p-6">
      <p className="eyebrow">{title}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
      <p className="mt-4 text-sm text-muted-foreground">Recebido</p>
      <p className="font-serif text-4xl font-semibold">{formatPrice(totals.received)}</p>
      <dl className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted-foreground">A receber</dt>
          <dd>{formatPrice(totals.expected)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Atendimentos</dt>
          <dd>{totals.count}</dd>
        </div>
      </dl>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-serif text-3xl font-semibold">{value}</p>
    </div>
  );
}
