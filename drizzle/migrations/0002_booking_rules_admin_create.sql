CREATE OR REPLACE FUNCTION public._book_appointment(
  p_name text, p_whatsapp text, p_notes text, p_date date, p_start_time time,
  p_service_ids uuid[], p_is_admin boolean, p_status text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_duration integer; v_price integer; v_count integer; v_id uuid;
  v_phone text := regexp_replace(coalesce(p_whatsapp,''), '\D', '', 'g');
  v_name text := btrim(coalesce(p_name,''));
  v_notes text := btrim(coalesce(p_notes,''));
  v_hours public.business_hours%ROWTYPE;
  v_buffer integer;
  v_start_min integer; v_end_min integer;
  v_now timestamp := now() AT TIME ZONE 'America/Sao_Paulo';
  v_end time;
BEGIN
  IF p_status NOT IN ('pendente','confirmado','concluido') THEN RAISE EXCEPTION 'Status inválido'; END IF;
  IF length(v_name) < 2 THEN RAISE EXCEPTION 'Nome inválido'; END IF;
  IF length(v_name) > 100 OR length(v_notes) > 500 THEN RAISE EXCEPTION 'Texto muito longo'; END IF;
  IF length(v_phone) < 10 OR length(v_phone) > 13 THEN RAISE EXCEPTION 'WhatsApp inválido'; END IF;
  IF p_date IS NULL OR p_start_time IS NULL THEN RAISE EXCEPTION 'Data ou horário inválido'; END IF;

  IF NOT p_is_admin THEN
    IF p_date < v_now::date THEN RAISE EXCEPTION 'Data no passado'; END IF;
    IF EXISTS (SELECT 1 FROM public.blocked_dates WHERE blocked_on = p_date) THEN RAISE EXCEPTION 'Data indisponível'; END IF;
  END IF;

  SELECT * INTO v_hours FROM public.business_hours WHERE weekday = extract(dow FROM p_date)::int LIMIT 1;
  IF NOT FOUND OR v_hours.is_closed THEN RAISE EXCEPTION 'Dia fechado'; END IF;

  SELECT coalesce(sum(duration_minutes),0), coalesce(sum(price_cents),0), count(*)
    INTO v_duration, v_price, v_count
  FROM public.services WHERE id = ANY(p_service_ids) AND active = true;
  IF v_count = 0 OR v_count <> coalesce(array_length(p_service_ids,1),0) THEN RAISE EXCEPTION 'Serviço inválido'; END IF;

  v_start_min := extract(hour FROM p_start_time)::int * 60 + extract(minute FROM p_start_time)::int;
  v_end_min := v_start_min + v_duration;
  IF v_end_min > 1440
     OR p_start_time < v_hours.open_time
     OR v_end_min > extract(hour FROM v_hours.close_time)::int * 60 + extract(minute FROM v_hours.close_time)::int THEN
    RAISE EXCEPTION 'Fora do horário de funcionamento';
  END IF;
  v_end := p_start_time + make_interval(mins => v_duration);

  IF NOT p_is_admin AND p_date = v_now::date AND (p_date + p_start_time) < v_now + interval '30 minutes' THEN
    RAISE EXCEPTION 'Horário indisponível';
  END IF;

  SELECT coalesce(buffer_minutes,0) INTO v_buffer FROM public.site_settings LIMIT 1;
  v_buffer := coalesce(v_buffer,0);
  IF v_buffer > 0 AND EXISTS (
    SELECT 1 FROM public.appointments a
    WHERE a.appointment_date = p_date AND a.status <> 'cancelado'
      AND (p_date + a.start_time) < (p_date + v_end) + make_interval(mins => v_buffer)
      AND (p_date + a.end_time) + make_interval(mins => v_buffer) > (p_date + p_start_time)
  ) THEN
    RAISE EXCEPTION 'Este horário acabou de ser reservado. Escolha outro.';
  END IF;

  IF NOT p_is_admin AND (
    SELECT count(*) FROM public.appointments
    WHERE customer_whatsapp = v_phone AND status = 'pendente'
      AND (appointment_date + start_time) >= v_now
  ) >= 3 THEN
    RAISE EXCEPTION 'Você já tem agendamentos pendentes. Aguarde a confirmação ou fale conosco no WhatsApp.';
  END IF;

  INSERT INTO public.appointments (customer_name, customer_whatsapp, appointment_date, start_time, end_time, status, notes, total_price_cents, total_duration_minutes)
  VALUES (v_name, v_phone, p_date, p_start_time, v_end, p_status, v_notes, v_price, v_duration)
  RETURNING id INTO v_id;

  INSERT INTO public.appointment_services (appointment_id, service_id, service_name, duration_minutes, price_cents)
  SELECT v_id, s.id, s.name, s.duration_minutes, s.price_cents FROM public.services s WHERE s.id = ANY(p_service_ids);

  RETURN v_id;
EXCEPTION WHEN exclusion_violation THEN
  RAISE EXCEPTION 'Este horário acabou de ser reservado. Escolha outro.';
END;
$$;
REVOKE ALL ON FUNCTION public._book_appointment(text,text,text,date,time,uuid[],boolean,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_appointment(
  p_name text, p_whatsapp text, p_notes text, p_date date, p_start_time time, p_service_ids uuid[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN public._book_appointment(p_name, p_whatsapp, p_notes, p_date, p_start_time, p_service_ids, false, 'pendente');
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_appointment(text,text,text,date,time,uuid[]) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_create_appointment(
  p_name text, p_whatsapp text, p_notes text, p_date date, p_start_time time, p_service_ids uuid[],
  p_status text DEFAULT 'confirmado'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  RETURN public._book_appointment(p_name, p_whatsapp, p_notes, p_date, p_start_time, p_service_ids, true, coalesce(p_status,'confirmado'));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_create_appointment(text,text,text,date,time,uuid[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_create_appointment(text,text,text,date,time,uuid[],text) TO authenticated;

DROP FUNCTION IF EXISTS public.claim_first_admin();