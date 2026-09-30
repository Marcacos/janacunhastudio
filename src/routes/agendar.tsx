import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Header } from "@/components/site/Header";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  blockedDatesQuery,
  businessHoursQuery,
  busyTimesQuery,
  createAppointment,
  servicesQuery,
  settingsQuery,
} from "@/lib/api";
import { buildSlots, nowMinutesInTimezone } from "@/lib/booking";
import {
  formatDateLong,
  formatDuration,
  formatPrice,
  toDateKey,
  todayKey,
  whatsappLink,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agendar")({
  head: () => ({
    meta: [
      { title: "Agendar horário — Janaína Cunha Studio" },
      {
        name: "description",
        content: "Escolha o serviço, o dia e o horário e reserve seu atendimento no Janaína Cunha Studio.",
      },
      { property: "og:title", content: "Agendar horário — Janaína Cunha Studio" },
      { property: "og:description", content: "Reserve seu atendimento online em poucos toques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Agendar,
});

const STEPS = ["Serviços", "Data", "Horário", "Seus dados", "Confirmação"];

function Agendar() {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const [done, setDone] = useState(false);

  const { data: services, isLoading: loadingServices } = useQuery(servicesQuery());
  const { data: hours } = useQuery(businessHoursQuery());
  const { data: blocked } = useQuery(blockedDatesQuery());
  const { data: settings } = useQuery(settingsQuery());

  const dateKey = date ? toDateKey(date) : null;
  const { data: busy, isLoading: loadingBusy } = useQuery(busyTimesQuery(dateKey));

  const chosen = (services ?? []).filter((s) => selected.includes(s.id));
  const totalDuration = chosen.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = chosen.reduce((sum, s) => sum + s.price_cents, 0);

  const blockedKeys = useMemo(() => new Set((blocked ?? []).map((b) => b.blocked_on)), [blocked]);
  const closedWeekdays = useMemo(
    () => new Set((hours ?? []).filter((h) => h.is_closed).map((h) => h.weekday)),
    [hours],
  );

  const slots = useMemo(() => {
    if (!dateKey || !hours || totalDuration === 0) return [];
    const weekday = new Date(`${dateKey}T12:00:00`).getDay();
    const day = hours.find((h) => h.weekday === weekday);
    if (!day || day.is_closed) return [];
    return buildSlots({
      openTime: day.open_time,
      closeTime: day.close_time,
      durationMinutes: totalDuration,
      intervalMinutes: settings?.slot_interval_minutes ?? 30,
      bufferMinutes: settings?.buffer_minutes ?? 0,
      busy: busy ?? [],
      minStartMinutes: dateKey === todayKey() ? nowMinutesInTimezone() + 30 : 0,
    });
  }, [dateKey, hours, totalDuration, settings, busy]);

  const mutation = useMutation({
    mutationFn: () =>
      createAppointment({
        name,
        whatsapp: phone,
        notes,
        date: dateKey!,
        startTime: time!,
        serviceIds: selected,
      }),
    onSuccess: () => {
      setDone(true);
      setStep(4);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Não foi possível concluir o agendamento. Tente novamente.");
    },
  });

  function toggleService(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
    setTime(null);
  }

  function validateDetails() {
    const next: { name?: string; phone?: string } = {};
    if (name.trim().length < 2) next.name = "Informe seu nome completo.";
    if (phone.replace(/\D/g, "").length < 10) next.phone = "Informe um WhatsApp válido com DDD.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  const confirmMessage = `Olá! Acabei de agendar pelo site.%0A%0ANome: ${name}%0AServiços: ${chosen
    .map((s) => s.name)
    .join(", ")}%0AData: ${dateKey ? formatDateLong(dateKey) : ""}%0AHorário: ${time ?? ""}`;

  return (
    <div className="min-h-screen bg-cream">
      <Header />
      <main className="mx-auto max-w-2xl px-5 pb-24 pt-28">
        <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-gold">
          <ArrowLeft className="size-3" /> Voltar
        </Link>

        <h1 className="mt-6 text-3xl md:text-4xl">Agendar horário</h1>
        <span className="gold-rule mt-5 w-24" aria-hidden="true" />

        <ol className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-[0.65rem] uppercase tracking-[0.2em]">
          {STEPS.map((label, i) => (
            <li key={label} className={cn(i === step ? "text-gold" : "text-muted-foreground/60")}>
              {i + 1}. {label}
            </li>
          ))}
        </ol>

        <div className="mt-8 border border-border bg-card p-6 md:p-8">
          {/* STEP 1 */}
          {step === 0 && (
            <div>
              <h2 className="text-2xl">Escolha os serviços</h2>
              {loadingServices ? (
                <p className="mt-6 text-sm text-muted-foreground">Carregando serviços…</p>
              ) : (
                <div className="mt-6 space-y-3">
                  {(services ?? []).map((service) => {
                    const active = selected.includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleService(service.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-4 border p-4 text-left transition-colors",
                          active ? "border-gold bg-accent" : "border-border hover:border-gold/50",
                        )}
                      >
                        <span>
                          <span className="block font-serif text-xl">{service.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDuration(service.duration_minutes)} · {formatPrice(service.price_cents)}
                          </span>
                        </span>
                        {active ? <Check className="size-4 shrink-0 text-gold" /> : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {selected.length > 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  Total: {formatDuration(totalDuration)} · <span className="text-gold">{formatPrice(totalPrice)}</span>
                </p>
              ) : null}

              <Button
                className="mt-8 w-full rounded-none uppercase tracking-[0.15em]"
                disabled={selected.length === 0}
                onClick={() => setStep(1)}
              >
                Continuar
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl">Escolha a data</h2>
              <div className="mt-6 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                  locale={undefined}
                  disabled={(d) => {
                    const key = toDateKey(d);
                    if (key < todayKey()) return true;
                    if (blockedKeys.has(key)) return true;
                    return closedWeekdays.has(d.getDay());
                  }}
                  className="pointer-events-auto"
                />
              </div>
              <div className="mt-8 flex gap-3">
                <Button variant="outline" className="flex-1 rounded-none" onClick={() => setStep(0)}>
                  Voltar
                </Button>
                <Button className="flex-1 rounded-none uppercase tracking-[0.15em]" disabled={!date} onClick={() => setStep(2)}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl">Escolha o horário</h2>
              <p className="mt-2 text-sm text-muted-foreground">{dateKey ? formatDateLong(dateKey) : ""}</p>
              {loadingBusy ? (
                <p className="mt-6 text-sm text-muted-foreground">Verificando disponibilidade…</p>
              ) : slots.length === 0 ? (
                <p className="mt-6 text-sm text-muted-foreground">
                  Não há horários livres nesta data para os serviços escolhidos. Tente outro dia.
                </p>
              ) : (
                <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      aria-pressed={time === slot}
                      onClick={() => setTime(slot)}
                      className={cn(
                        "border py-3 text-sm transition-colors",
                        time === slot ? "border-gold bg-accent text-gold" : "border-border hover:border-gold/50",
                      )}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-8 flex gap-3">
                <Button variant="outline" className="flex-1 rounded-none" onClick={() => setStep(1)}>
                  Voltar
                </Button>
                <Button className="flex-1 rounded-none uppercase tracking-[0.15em]" disabled={!time} onClick={() => setStep(3)}>
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 3 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (validateDetails()) mutation.mutate();
              }}
            >
              <h2 className="text-2xl">Seus dados</h2>
              <div className="mt-6 space-y-5">
                <div>
                  <Label htmlFor="name">Nome completo</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-2 rounded-none"
                    aria-invalid={!!errors.name}
                  />
                  {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
                </div>
                <div>
                  <Label htmlFor="phone">WhatsApp (com DDD)</Label>
                  <Input
                    id="phone"
                    inputMode="tel"
                    placeholder="(11) 90000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-2 rounded-none"
                    aria-invalid={!!errors.phone}
                  />
                  {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone}</p> : null}
                </div>
                <div>
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2 rounded-none"
                    rows={3}
                  />
                </div>
              </div>

              <div className="mt-6 border-t border-border pt-4 text-sm text-muted-foreground">
                <p>{chosen.map((s) => s.name).join(", ")}</p>
                <p>
                  {dateKey ? formatDateLong(dateKey) : ""} às {time}
                </p>
                <p className="text-gold">
                  {formatDuration(totalDuration)} · {formatPrice(totalPrice)}
                </p>
              </div>

              <div className="mt-8 flex gap-3">
                <Button type="button" variant="outline" className="flex-1 rounded-none" onClick={() => setStep(2)}>
                  Voltar
                </Button>
                <Button type="submit" className="flex-1 rounded-none uppercase tracking-[0.15em]" disabled={mutation.isPending}>
                  {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirmar"}
                </Button>
              </div>
            </form>
          )}

          {/* STEP 5 */}
          {step === 4 && done && (
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-accent">
                <Check className="size-6 text-gold" />
              </div>
              <h2 className="mt-6 text-2xl">Agendamento confirmado</h2>
              <span className="gold-rule mx-auto mt-5 w-24" aria-hidden="true" />
              <div className="mt-6 space-y-1 text-sm text-muted-foreground">
                <p>{chosen.map((s) => s.name).join(", ")}</p>
                <p>{dateKey ? formatDateLong(dateKey) : ""}</p>
                <p>
                  {time} · {formatDuration(totalDuration)} · {formatPrice(totalPrice)}
                </p>
              </div>
              {settings?.whatsapp ? (
                <Button asChild className="mt-8 w-full rounded-none uppercase tracking-[0.15em]">
                  <a href={`${whatsappLink(settings.whatsapp)}?text=${confirmMessage}`} target="_blank" rel="noreferrer">
                    Enviar confirmação no WhatsApp
                  </a>
                </Button>
              ) : null}
              <Button asChild variant="outline" className="mt-3 w-full rounded-none">
                <Link to="/">Voltar ao início</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
