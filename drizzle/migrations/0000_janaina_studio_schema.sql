CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- SERVICES
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads active services" ON public.services FOR SELECT TO anon, authenticated USING (active = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage services" ON public.services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BUSINESS HOURS
CREATE TABLE public.business_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  weekday smallint NOT NULL UNIQUE CHECK (weekday BETWEEN 0 AND 6),
  is_closed boolean NOT NULL DEFAULT false,
  open_time time NOT NULL DEFAULT '09:00',
  close_time time NOT NULL DEFAULT '19:00'
);
GRANT SELECT ON public.business_hours TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_hours TO authenticated;
GRANT ALL ON public.business_hours TO service_role;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads business hours" ON public.business_hours FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage business hours" ON public.business_hours FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- BLOCKED DATES
CREATE TABLE public.blocked_dates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocked_on date NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.blocked_dates TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blocked_dates TO authenticated;
GRANT ALL ON public.blocked_dates TO service_role;
ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads blocked dates" ON public.blocked_dates FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage blocked dates" ON public.blocked_dates FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- SITE SETTINGS
CREATE TABLE public.site_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  whatsapp text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  instagram text NOT NULL DEFAULT '',
  map_embed_url text NOT NULL DEFAULT '',
  slot_interval_minutes integer NOT NULL DEFAULT 30 CHECK (slot_interval_minutes > 0),
  buffer_minutes integer NOT NULL DEFAULT 0 CHECK (buffer_minutes >= 0),
  about_text text NOT NULL DEFAULT ''
);
GRANT SELECT ON public.site_settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_settings TO authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads settings" ON public.site_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage settings" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_whatsapp text NOT NULL,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','confirmado','concluido','cancelado')),
  notes text NOT NULL DEFAULT '',
  total_price_cents integer NOT NULL DEFAULT 0,
  total_duration_minutes integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_time > start_time),
  EXCLUDE USING gist (
    appointment_date WITH =,
    tsrange(appointment_date + start_time, appointment_date + end_time) WITH &&
  ) WHERE (status <> 'cancelado')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage appointments" ON public.appointments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.appointment_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  service_name text NOT NULL,
  duration_minutes integer NOT NULL,
  price_cents integer NOT NULL
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointment_services TO authenticated;
GRANT ALL ON public.appointment_services TO service_role;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage appointment services" ON public.appointment_services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PUBLIC: busy slots without PII
CREATE OR REPLACE FUNCTION public.get_busy_times(p_date date)
RETURNS TABLE (start_time time, end_time time)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.start_time, a.end_time FROM public.appointments a
  WHERE a.appointment_date = p_date AND a.status <> 'cancelado'
$$;
GRANT EXECUTE ON FUNCTION public.get_busy_times(date) TO anon, authenticated;

-- PUBLIC: create appointment safely
CREATE OR REPLACE FUNCTION public.create_appointment(
  p_name text,
  p_whatsapp text,
  p_notes text,
  p_date date,
  p_start_time time,
  p_service_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_duration integer;
  v_price integer;
  v_id uuid;
  v_count integer;
BEGIN
  IF length(btrim(p_name)) < 2 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF length(regexp_replace(coalesce(p_whatsapp,''), '\D', '', 'g')) < 10 THEN RAISE EXCEPTION 'WhatsApp inválido'; END IF;
  IF p_date < (now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Data no passado'; END IF;
  IF EXISTS (SELECT 1 FROM public.blocked_dates WHERE blocked_on = p_date) THEN RAISE EXCEPTION 'Data indisponível'; END IF;

  SELECT coalesce(sum(duration_minutes),0), coalesce(sum(price_cents),0), count(*)
    INTO v_duration, v_price, v_count
  FROM public.services WHERE id = ANY(p_service_ids) AND active = true;

  IF v_count = 0 OR v_count <> array_length(p_service_ids, 1) THEN
    RAISE EXCEPTION 'Serviço inválido';
  END IF;

  INSERT INTO public.appointments (customer_name, customer_whatsapp, appointment_date, start_time, end_time, notes, total_price_cents, total_duration_minutes)
  VALUES (btrim(p_name), btrim(p_whatsapp), p_date, p_start_time, p_start_time + (v_duration || ' minutes')::interval, coalesce(btrim(p_notes),''), v_price, v_duration)
  RETURNING id INTO v_id;

  INSERT INTO public.appointment_services (appointment_id, service_id, service_name, duration_minutes, price_cents)
  SELECT v_id, s.id, s.name, s.duration_minutes, s.price_cents
  FROM public.services s WHERE s.id = ANY(p_service_ids);

  RETURN v_id;
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Este horário acabou de ser reservado. Escolha outro.';
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_appointment(text, text, text, date, time, uuid[]) TO anon, authenticated;

-- SEED
INSERT INTO public.services (name, description, duration_minutes, price_cents, sort_order) VALUES
  ('Corte feminino', 'Corte personalizado com finalização.', 60, 12000, 1),
  ('Escova', 'Escova modeladora com produtos premium.', 45, 8000, 2),
  ('Coloração', 'Coloração completa com cuidado na saúde do fio.', 120, 25000, 3),
  ('Manicure e pedicure', 'Cuidado completo para mãos e pés.', 90, 9000, 4),
  ('Design de sobrancelhas', 'Design personalizado ao formato do rosto.', 30, 5000, 5),
  ('Hidratação', 'Tratamento profundo de nutrição capilar.', 60, 11000, 6);

INSERT INTO public.business_hours (weekday, is_closed, open_time, close_time) VALUES
  (0, true, '09:00', '18:00'),
  (1, true, '09:00', '18:00'),
  (2, false, '09:00', '19:00'),
  (3, false, '09:00', '19:00'),
  (4, false, '09:00', '19:00'),
  (5, false, '09:00', '19:00'),
  (6, false, '09:00', '17:00');

INSERT INTO public.site_settings (id, whatsapp, address, instagram, map_embed_url, about_text) VALUES
  (true, '5500000000000', '[PLACEHOLDER] Rua Exemplo, 123 - Centro', '@janainacunhastudio', '', '[PLACEHOLDER] Há mais de 15 anos cuidando da beleza e da autoestima de cada cliente.');