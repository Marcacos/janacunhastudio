import { supabase } from "@/integrations/supabase/client";

export type Service = {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  sort_order: number;
};

export type BusinessHour = {
  id: string;
  weekday: number;
  is_closed: boolean;
  open_time: string;
  close_time: string;
};

export type BlockedDate = { id: string; blocked_on: string; reason: string };

export type SiteSettings = {
  id: boolean;
  whatsapp: string;
  address: string;
  instagram: string;
  map_embed_url: string;
  slot_interval_minutes: number;
  buffer_minutes: number;
  about_text: string;
};

export type Appointment = {
  id: string;
  customer_name: string;
  customer_whatsapp: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: "pendente" | "confirmado" | "concluido" | "cancelado";
  notes: string;
  total_price_cents: number;
  total_duration_minutes: number;
  created_at: string;
  appointment_services?: { service_name: string; duration_minutes: number; price_cents: number }[];
};

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export const servicesQuery = (includeInactive = false) => ({
  queryKey: ["services", includeInactive],
  queryFn: async () => {
    let q = supabase.from("services").select("*").order("sort_order");
    if (!includeInactive) q = q.eq("active", true);
    return unwrap(await q) as unknown as Service[];
  },
});

export const businessHoursQuery = () => ({
  queryKey: ["business_hours"],
  queryFn: async () =>
    unwrap(await supabase.from("business_hours").select("*").order("weekday")) as unknown as BusinessHour[],
});

export const blockedDatesQuery = () => ({
  queryKey: ["blocked_dates"],
  queryFn: async () =>
    unwrap(await supabase.from("blocked_dates").select("*").order("blocked_on")) as unknown as BlockedDate[],
});

export const settingsQuery = () => ({
  queryKey: ["site_settings"],
  queryFn: async () =>
    unwrap(await supabase.from("site_settings").select("*").maybeSingle()) as unknown as SiteSettings | null,
});

export const busyTimesQuery = (date: string | null) => ({
  queryKey: ["busy_times", date],
  enabled: !!date,
  queryFn: async () => {
    const res = await supabase.rpc("get_busy_times", { p_date: date! });
    if (res.error) throw new Error(res.error.message);
    return (res.data ?? []) as { start_time: string; end_time: string }[];
  },
});

export const appointmentsQuery = () => ({
  queryKey: ["appointments"],
  queryFn: async () =>
    unwrap(
      await supabase
        .from("appointments")
        .select("*, appointment_services(service_name, duration_minutes, price_cents)")
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true }),
    ) as unknown as Appointment[],
});

export async function createAppointment(input: {
  name: string;
  whatsapp: string;
  notes: string;
  date: string;
  startTime: string;
  serviceIds: string[];
}) {
  const res = await supabase.rpc("create_appointment", {
    p_name: input.name,
    p_whatsapp: input.whatsapp,
    p_notes: input.notes,
    p_date: input.date,
    p_start_time: input.startTime,
    p_service_ids: input.serviceIds,
  });
  if (res.error) throw new Error(res.error.message);
  return res.data as string;
}
