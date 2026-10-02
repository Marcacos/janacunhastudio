import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, LogOut, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Logo } from "@/components/site/Logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  type Appointment,
  type Service,
  appointmentsQuery,
  blockedDatesQuery,
  businessHoursQuery,
  createAppointment,
  servicesQuery,
  settingsQuery,
} from "@/lib/api";
import {
  WEEKDAY_LABELS,
  formatDateShort,
  formatDuration,
  formatPrice,
  formatTime,
  todayKey,
  whatsappLink,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel — Janaína Cunha Studio" },
      { name: "description", content: "Painel administrativo do Janaína Cunha Studio." },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Painel — Janaína Cunha Studio" },
      { property: "og:description", content: "Gestão de agendamentos, serviços e configurações." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

const STATUS_LABELS: Record<Appointment["status"], string> = {
  pendente: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo className="h-14" />
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 size-4" /> Sair
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Tabs defaultValue="agenda">
          <TabsList className="rounded-none">
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="servicos">Serviços</TabsTrigger>
            <TabsTrigger value="config">Configurações</TabsTrigger>
          </TabsList>
          <TabsContent value="agenda" className="mt-6">
            <AgendaTab />
          </TabsContent>
          <TabsContent value="servicos" className="mt-6">
            <ServicesTab />
          </TabsContent>
          <TabsContent value="config" className="mt-6">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* -------------------------------- AGENDA -------------------------------- */

function AgendaTab() {
  const queryClient = useQueryClient();
  const { data: appointments, isLoading } = useQuery(appointmentsQuery());
  const { data: services } = useQuery(servicesQuery(true));

  const [period, setPeriod] = useState("proximos");
  const [status, setStatus] = useState("todos");
  const [search, setSearch] = useState("");

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { status: Appointment["status"] } }) => {
      const { error } = await supabase.from("appointments").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento atualizado.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const today = todayKey();
  const filtered = useMemo(() => {
    const list = appointments ?? [];
    const inPeriod = (a: Appointment) => {
      if (period === "todos") return true;
      if (period === "hoje") return a.appointment_date === today;
      if (period === "proximos") return a.appointment_date >= today;
      const d = new Date(`${a.appointment_date}T12:00:00`);
      const now = new Date(`${today}T12:00:00`);
      const diff = (d.getTime() - now.getTime()) / 86400000;
      if (period === "semana") return diff >= 0 && diff < 7;
      if (period === "mes") return diff >= 0 && diff < 31;
      return true;
    };
    return list.filter(
      (a) =>
        inPeriod(a) &&
        (status === "todos" || a.status === status) &&
        (search.trim() === "" || a.customer_name.toLowerCase().includes(search.trim().toLowerCase())),
    );
  }, [appointments, period, status, search, today]);

  const todayList = (appointments ?? []).filter((a) => a.appointment_date === today && a.status !== "cancelado");

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Hoje" value={String(todayList.length)} hint="atendimentos" />
        <StatCard
          label="Próximos"
          value={String((appointments ?? []).filter((a) => a.appointment_date > today && a.status !== "cancelado").length)}
          hint="agendados"
        />
        <StatCard
          label="Receita prevista (hoje)"
          value={formatPrice(todayList.reduce((s, a) => s + a.total_price_cents, 0))}
          hint=""
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40">
          <Label className="text-xs">Período</Label>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="mt-1 rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="proximos">Próximos</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mês</SelectItem>
              <SelectItem value="todos">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-40">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="mt-1 rounded-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="confirmado">Confirmado</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-48 flex-1">
          <Label className="text-xs">Buscar por nome</Label>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} className="mt-1 rounded-none" />
        </div>
        <ManualBookingDialog services={services ?? []} />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando agendamentos…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum agendamento encontrado para estes filtros.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <article key={a.id} className="border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-serif text-xl">{a.customer_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDateShort(a.appointment_date)} · {formatTime(a.start_time)} – {formatTime(a.end_time)} ·{" "}
                    {formatDuration(a.total_duration_minutes)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {(a.appointment_services ?? []).map((s) => s.service_name).join(", ")}
                  </p>
                  <a
                    href={whatsappLink(a.customer_whatsapp)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-sm text-gold hover:underline"
                  >
                    {a.customer_whatsapp}
                  </a>
                  {a.notes ? <p className="mt-2 text-sm italic text-muted-foreground">“{a.notes}”</p> : null}
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="rounded-none border-gold text-gold">
                    {STATUS_LABELS[a.status]}
                  </Badge>
                  <p className="mt-2 text-sm">{formatPrice(a.total_price_cents)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => update.mutate({ id: a.id, patch: { status: "confirmado" } })}>
                  Confirmar
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => update.mutate({ id: a.id, patch: { status: "concluido" } })}>
                  Concluir
                </Button>
                <Button size="sm" variant="outline" className="rounded-none" onClick={() => update.mutate({ id: a.id, patch: { status: "cancelado" } })}>
                  Cancelar
                </Button>
                <RescheduleDialog appointment={a} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="border border-border bg-card p-5">
      <p className="eyebrow">{label}</p>
      <p className="mt-2 font-serif text-3xl">{value}</p>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function RescheduleDialog({ appointment }: { appointment: Appointment }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(appointment.appointment_date);
  const [start, setStart] = useState(formatTime(appointment.start_time));

  const save = useMutation({
    mutationFn: async () => {
      const [h, m] = start.split(":").map(Number);
      const endMinutes = (h ?? 0) * 60 + (m ?? 0) + appointment.total_duration_minutes;
      const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
      const { error } = await supabase
        .from("appointments")
        .update({ appointment_date: date, start_time: start, end_time: end })
        .eq("id", appointment.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento remarcado.");
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-none">
          Reagendar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reagendar</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="r-date">Data</Label>
            <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 rounded-none" />
          </div>
          <div>
            <Label htmlFor="r-time">Horário</Label>
            <Input id="r-time" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-2 rounded-none" />
          </div>
          <Button className="w-full rounded-none" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManualBookingDialog({ services }: { services: Service[] }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [date, setDate] = useState(todayKey());
  const [time, setTime] = useState("09:00");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const save = useMutation({
    mutationFn: () =>
      createAppointment({ name, whatsapp: phone, notes, date, startTime: time, serviceIds: selected }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Agendamento criado.");
      setOpen(false);
      setName("");
      setPhone("");
      setSelected([]);
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-none uppercase tracking-[0.15em]">
          <Plus className="mr-2 size-4" /> Novo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="m-name">Nome</Label>
            <Input id="m-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 rounded-none" />
          </div>
          <div>
            <Label htmlFor="m-phone">WhatsApp</Label>
            <Input id="m-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 rounded-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="m-date">Data</Label>
              <Input id="m-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 rounded-none" />
            </div>
            <div>
              <Label htmlFor="m-time">Horário</Label>
              <Input id="m-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-2 rounded-none" />
            </div>
          </div>
          <div>
            <Label>Serviços</Label>
            <div className="mt-2 space-y-2">
              {services
                .filter((s) => s.active)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() =>
                      setSelected((prev) => (prev.includes(s.id) ? prev.filter((x) => x !== s.id) : [...prev, s.id]))
                    }
                    className={cn(
                      "w-full border p-3 text-left text-sm",
                      selected.includes(s.id) ? "border-gold bg-accent" : "border-border",
                    )}
                  >
                    {s.name} · {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}
                  </button>
                ))}
            </div>
          </div>
          <div>
            <Label htmlFor="m-notes">Observações</Label>
            <Textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-2 rounded-none" />
          </div>
          <Button
            className="w-full rounded-none"
            disabled={save.isPending || selected.length === 0}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Criar agendamento"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------- SERVIÇOS -------------------------------- */

const EMPTY_SERVICE = { name: "", description: "", duration_minutes: 60, price_cents: 0, sort_order: 99 };

function ServicesTab() {
  const queryClient = useQueryClient();
  const { data: services } = useQuery(servicesQuery(true));
  const [editing, setEditing] = useState<(Partial<Service> & { id?: string }) | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["services"] });

  const save = useMutation({
    mutationFn: async (service: Partial<Service> & { id?: string }) => {
      const payload = {
        name: service.name ?? "",
        description: service.description ?? "",
        duration_minutes: Number(service.duration_minutes ?? 60),
        price_cents: Number(service.price_cents ?? 0),
        sort_order: Number(service.sort_order ?? 99),
      };
      const res = service.id
        ? await supabase.from("services").update(payload).eq("id", service.id)
        : await supabase.from("services").insert(payload);
      if (res.error) throw new Error(res.error.message);
    },
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Serviço salvo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("services").update({ active }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      invalidate();
      toast.success("Serviço excluído.");
    },
    onError: () => toast.error("Não é possível excluir um serviço já usado em agendamentos. Desative-o."),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="rounded-none uppercase tracking-[0.15em]" onClick={() => setEditing({ ...EMPTY_SERVICE })}>
          <Plus className="mr-2 size-4" /> Novo serviço
        </Button>
      </div>

      <div className="space-y-3">
        {(services ?? []).map((s) => (
          <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 border border-border bg-card p-5">
            <div>
              <p className="font-serif text-xl">{s.name}</p>
              <p className="text-sm text-muted-foreground">{s.description}</p>
              <p className="mt-1 text-sm text-gold">
                {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  checked={s.active}
                  onCheckedChange={(active) => toggle.mutate({ id: s.id, active })}
                  aria-label={`Ativar ${s.name}`}
                />
                <span className="text-xs text-muted-foreground">{s.active ? "Ativo" : "Inativo"}</span>
              </div>
              <Button size="sm" variant="outline" className="rounded-none" onClick={() => setEditing(s)}>
                Editar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)} aria-label={`Excluir ${s.name}`}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="s-name">Nome</Label>
                <Input
                  id="s-name"
                  value={editing.name ?? ""}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  className="mt-2 rounded-none"
                />
              </div>
              <div>
                <Label htmlFor="s-desc">Descrição</Label>
                <Textarea
                  id="s-desc"
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="mt-2 rounded-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="s-dur">Duração (min)</Label>
                  <Input
                    id="s-dur"
                    type="number"
                    value={editing.duration_minutes ?? 60}
                    onChange={(e) => setEditing({ ...editing, duration_minutes: Number(e.target.value) })}
                    className="mt-2 rounded-none"
                  />
                </div>
                <div>
                  <Label htmlFor="s-price">Preço (R$)</Label>
                  <Input
                    id="s-price"
                    type="number"
                    step="0.01"
                    value={(editing.price_cents ?? 0) / 100}
                    onChange={(e) => setEditing({ ...editing, price_cents: Math.round(Number(e.target.value) * 100) })}
                    className="mt-2 rounded-none"
                  />
                </div>
              </div>
              <Button className="w-full rounded-none" onClick={() => save.mutate(editing)} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ----------------------------- CONFIGURAÇÕES ----------------------------- */

function SettingsTab() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery(settingsQuery());
  const { data: hours } = useQuery(businessHoursQuery());
  const { data: blocked } = useQuery(blockedDatesQuery());
  const [newBlocked, setNewBlocked] = useState("");
  const [form, setForm] = useState<Record<string, string | number> | null>(null);

  const current = form ?? (settings ? ({ ...settings, id: 1 } as Record<string, string | number>) : null);

  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!current) return;
      const { error } = await supabase
        .from("site_settings")
        .update({
          whatsapp: String(current["whatsapp"] ?? ""),
          address: String(current["address"] ?? ""),
          instagram: String(current["instagram"] ?? ""),
          map_embed_url: String(current["map_embed_url"] ?? ""),
          slot_interval_minutes: Number(current["slot_interval_minutes"] ?? 30),
          buffer_minutes: Number(current["buffer_minutes"] ?? 0),
          about_text: String(current["about_text"] ?? ""),
        })
        .eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_settings"] });
      toast.success("Configurações salvas.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveHour = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { is_closed?: boolean; open_time?: string; close_time?: string } }) => {
      const { error } = await supabase.from("business_hours").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["business_hours"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addBlocked = useMutation({
    mutationFn: async (dateStr: string) => {
      const { error } = await supabase.from("blocked_dates").insert({ blocked_on: dateStr });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked_dates"] });
      setNewBlocked("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeBlocked = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_dates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blocked_dates"] }),
  });

  const set = (key: string, value: string | number) => setForm({ ...(current ?? {}), [key]: value });

  return (
    <div className="space-y-8">
      <section className="border border-border bg-card p-6">
        <h2 className="text-2xl">Horário de funcionamento</h2>
        <div className="mt-6 space-y-3">
          {(hours ?? []).map((h) => (
            <div key={h.id} className="flex flex-wrap items-center gap-3">
              <span className="w-32 text-sm">{WEEKDAY_LABELS[h.weekday]}</span>
              <Switch
                checked={!h.is_closed}
                onCheckedChange={(open) => saveHour.mutate({ id: h.id, patch: { is_closed: !open } })}
                aria-label={`Abrir ${WEEKDAY_LABELS[h.weekday]}`}
              />
              <Input
                type="time"
                defaultValue={formatTime(h.open_time)}
                onBlur={(e) => saveHour.mutate({ id: h.id, patch: { open_time: e.target.value } })}
                className="w-32 rounded-none"
                disabled={h.is_closed}
              />
              <Input
                type="time"
                defaultValue={formatTime(h.close_time)}
                onBlur={(e) => saveHour.mutate({ id: h.id, patch: { close_time: e.target.value } })}
                className="w-32 rounded-none"
                disabled={h.is_closed}
              />
            </div>
          ))}
        </div>
      </section>

      <section className="border border-border bg-card p-6">
        <h2 className="text-2xl">Dias bloqueados</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          <Input type="date" value={newBlocked} onChange={(e) => setNewBlocked(e.target.value)} className="w-48 rounded-none" />
          <Button className="rounded-none" disabled={!newBlocked} onClick={() => addBlocked.mutate(newBlocked)}>
            Bloquear
          </Button>
        </div>
        <ul className="mt-4 space-y-2">
          {(blocked ?? []).map((b) => (
            <li key={b.id} className="flex items-center justify-between border-b border-border pb-2 text-sm">
              <span>{formatDateShort(b.blocked_on)}</span>
              <Button size="sm" variant="ghost" onClick={() => removeBlocked.mutate(b.id)} aria-label="Remover bloqueio">
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-border bg-card p-6">
        <h2 className="text-2xl">Contato e agenda</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="c-whats">WhatsApp (só números, com DDI)</Label>
            <Input
              id="c-whats"
              value={String(current?.["whatsapp"] ?? "")}
              onChange={(e) => set("whatsapp", e.target.value)}
              className="mt-2 rounded-none"
            />
          </div>
          <div>
            <Label htmlFor="c-insta">Instagram</Label>
            <Input
              id="c-insta"
              value={String(current?.["instagram"] ?? "")}
              onChange={(e) => set("instagram", e.target.value)}
              className="mt-2 rounded-none"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="c-addr">Endereço</Label>
            <Input
              id="c-addr"
              value={String(current?.["address"] ?? "")}
              onChange={(e) => set("address", e.target.value)}
              className="mt-2 rounded-none"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="c-map">Link do mapa incorporado (iframe src do Google Maps)</Label>
            <Input
              id="c-map"
              value={String(current?.["map_embed_url"] ?? "")}
              onChange={(e) => set("map_embed_url", e.target.value)}
              className="mt-2 rounded-none"
            />
          </div>
          <div>
            <Label htmlFor="c-interval">Intervalo entre horários (min)</Label>
            <Input
              id="c-interval"
              type="number"
              value={Number(current?.["slot_interval_minutes"] ?? 30)}
              onChange={(e) => set("slot_interval_minutes", Number(e.target.value))}
              className="mt-2 rounded-none"
            />
          </div>
          <div>
            <Label htmlFor="c-buffer">Intervalo entre atendimentos (min)</Label>
            <Input
              id="c-buffer"
              type="number"
              value={Number(current?.["buffer_minutes"] ?? 0)}
              onChange={(e) => set("buffer_minutes", Number(e.target.value))}
              className="mt-2 rounded-none"
            />
          </div>
        </div>
        <Button className="mt-6 rounded-none uppercase tracking-[0.15em]" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
          {saveSettings.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar configurações"}
        </Button>
      </section>
    </div>
  );
}
