-- PhishGuard mide a la persona: el canal donde vive el engaño, un refuerzo
-- para quien cayó, una lección también para quien no tocó el enlace, y
-- plantillas que nacen de las amenazas que marca SafeLink.

alter table public.campanas
  add column if not exists canal text not null default 'email';

alter table public.campanas
  drop constraint if exists campanas_canal_check;

alter table public.campanas
  add constraint campanas_canal_check
  check (canal in ('email', 'whatsapp', 'sms'));

alter table public.campanas
  add column if not exists origen_campana_id uuid references public.campanas (id) on delete set null;

alter table public.campanas
  add column if not exists es_refuerzo boolean not null default false;

alter table public.plantillas_phishing
  add column if not exists canal text not null default 'email';

alter table public.plantillas_phishing
  drop constraint if exists plantillas_canal_check;

alter table public.plantillas_phishing
  add constraint plantillas_canal_check
  check (canal in ('email', 'whatsapp', 'sms', 'todos'));

alter table public.plantillas_phishing
  add column if not exists amenaza_dominio text references public.amenazas (dominio) on delete set null;

alter table public.eventos_simulacion
  add column if not exists vio_reconocimiento boolean not null default false;

alter table public.eventos_simulacion
  drop constraint if exists eventos_simulacion_campana_empleado_key;

alter table public.eventos_simulacion
  add constraint eventos_simulacion_campana_empleado_key unique (campana_id, empleado_id);

-- ---------------------------------------------------------------------------
-- Plantillas semilla: el CEO y el paquete viven en WhatsApp / SMS
-- ---------------------------------------------------------------------------

insert into public.plantillas_phishing (
  titulo, asunto_mail, remitente_falso, cuerpo_html,
  nivel_dificultad, categoria, canal, metadata
)
select * from (values
  (
    'CEO por WhatsApp: transferí ahora',
    'Necesito un favor urgente',
    'Director',
    'Hola, soy el director. Estoy en una reunión y no puedo hablar. Necesito que hagas una transferencia ahora, el proveedor no espera. Entrá acá y confirmá: {link}',
    'alto',
    'CEO',
    'whatsapp',
    '{"lesson":{"titulo":"El jefe no pide transferencias por WhatsApp","cuerpo":"Un CEO real llama, manda un mail corporativo o pasa por finanzas. El apuro, el secreto y el enlace son el engaño. Si alguien se hace pasar por gerencia, cortá y confirmá por otro canal."}}'::jsonb
  ),
  (
    'Paquete retenido — SMS',
    'Tu envío está retenido',
    'Correo Argentino',
    'Tu paquete no se pudo entregar. Pagá $2.490 de aduana en 24 hs o vuelve al centro: {link}',
    'medio',
    'PAQUETE',
    'sms',
    '{"lesson":{"titulo":"Correo Argentino no cobra por un SMS","cuerpo":"El paquete retenido es la estafa más común de la región. El verdadero correo no manda un link genérico ni pide una tasa por mensaje de texto."}}'::jsonb
  ),
  (
    'Paquete retenido — WhatsApp',
    'No pudimos entregar tu pedido',
    'Andreani',
    'Hola! Intentamos entregar tu pedido y no había nadie. Reprogramá acá antes de que se devuelva: {link}',
    'medio',
    'PAQUETE',
    'whatsapp',
    '{"lesson":{"titulo":"La empresa de envíos no te escribe por WhatsApp personal","cuerpo":"Andreani, Correo Argentino o Mercado Libre te avisan en su app o por mail. Un chat de WhatsApp con un link corto es el cebo."}}'::jsonb
  ),
  (
    'AFIP — intimación por mail',
    'Intimación: presentá el F. 931',
    'AFIP',
    'Detectamos una inconsistencia en tus declaraciones. Ingresá con clave fiscal para evitar la multa: {link}',
    'alto',
    'ORGANISMO',
    'email',
    '{"lesson":{"titulo":"AFIP no manda un link genérico","cuerpo":"La intimación verdadera está en el domicilio fiscal electrónico. Si el remitente no es un dominio oficial, no entres."}}'::jsonb
  ),
  (
    'Banco — verificar cuenta',
    'Bloqueamos tu home banking',
    'Soporte Banco',
    'Detectamos un acceso inusual. Verificá tu identidad en las próximas 2 horas o la cuenta queda inhabilitada: {link}',
    'medio',
    'BANCO',
    'email',
    '{"lesson":{"titulo":"El banco no te apura por un enlace","cuerpo":"Si hay un problema de verdad, entrás vos a la app o a la URL que ya conocés. Nunca desde el mail."}}'::jsonb
  ),
  (
    'RRHH — recibo de sueldo',
    'Tu recibo de sueldo',
    'Recursos Humanos',
    'Adjuntamos el recibo de este mes. Abrilo para confirmar que los datos están bien: {link}',
    'bajo',
    'RRHH',
    'email',
    '{"lesson":{"titulo":"El recibo no llega como un enlace raro","cuerpo":"RRHH usa el portal de siempre. Un mail con un link o un adjunto inesperado, aunque parezca interno, es un cebo suave: por eso es el primero."}}'::jsonb
  )
) as semilla (titulo, asunto_mail, remitente_falso, cuerpo_html, nivel_dificultad, categoria, canal, metadata)
where not exists (
  select 1 from public.plantillas_phishing p where p.titulo = semilla.titulo
);

-- ---------------------------------------------------------------------------
-- Quien cayó recibe un refuerzo a las 3 semanas, un poco más difícil
-- ---------------------------------------------------------------------------

create or replace function public.phishguard_programar_refuerzo(
  p_campana_id uuid,
  p_empleado_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_camp record;
  v_refuerzo record;
  v_plantilla uuid;
  v_pendientes uuid[];
begin
  select id, organizacion_id, canal, plantilla_id, es_refuerzo, nombre_campana
  into v_camp
  from public.campanas
  where id = p_campana_id;

  if v_camp.id is null or v_camp.es_refuerzo then
    return;
  end if;

  select id into v_plantilla
  from public.plantillas_phishing
  where (canal = v_camp.canal or canal = 'todos')
    and nivel_dificultad = 'alto'
    and (v_camp.plantilla_id is null or id <> v_camp.plantilla_id)
  order by creado_en
  limit 1;

  if v_plantilla is null then
    select id into v_plantilla
    from public.plantillas_phishing
    where nivel_dificultad = 'alto'
    limit 1;
  end if;

  if v_plantilla is null then
    v_plantilla := v_camp.plantilla_id;
  end if;

  select id, extra, estado
  into v_refuerzo
  from public.campanas
  where origen_campana_id = p_campana_id
    and es_refuerzo
  limit 1;

  if v_refuerzo.id is null then
    insert into public.campanas (
      organizacion_id, plantilla_id, nombre_campana, estado, canal,
      origen_campana_id, es_refuerzo, fecha_inicio, extra
    ) values (
      v_camp.organizacion_id,
      v_plantilla,
      format('Refuerzo · %s', v_camp.nombre_campana),
      'programada',
      v_camp.canal,
      p_campana_id,
      true,
      now() + interval '21 days',
      jsonb_build_object('pendientes', jsonb_build_array(p_empleado_id))
    );
    return;
  end if;

  v_pendientes := array(
    select jsonb_array_elements_text(coalesce(v_refuerzo.extra->'pendientes', '[]'::jsonb))::uuid
  );

  if p_empleado_id = any (v_pendientes) then
    return;
  end if;

  if exists (
    select 1 from public.eventos_simulacion
    where campana_id = v_refuerzo.id and empleado_id = p_empleado_id
  ) then
    return;
  end if;

  if v_refuerzo.estado = 'en_proceso' then
    insert into public.eventos_simulacion (campana_id, empleado_id, token_unico)
    values (
      v_refuerzo.id,
      p_empleado_id,
      encode(gen_random_bytes(16), 'hex')
    );
  else
    update public.campanas
      set extra = jsonb_set(
        coalesce(extra, '{}'::jsonb),
        '{pendientes}',
        coalesce(extra->'pendientes', '[]'::jsonb) || to_jsonb(p_empleado_id)
      )
    where id = v_refuerzo.id;
  end if;
end;
$$;

create or replace function public.phishguard_al_caer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.hizo_clic and not coalesce(old.hizo_clic, false))
     or (new.ingreso_datos and not coalesce(old.ingreso_datos, false)) then
    perform public.phishguard_programar_refuerzo(new.campana_id, new.empleado_id);
  end if;
  return new;
end;
$$;

drop trigger if exists phishguard_al_caer on public.eventos_simulacion;

create trigger phishguard_al_caer
after insert or update of hizo_clic, ingreso_datos
on public.eventos_simulacion
for each row
execute function public.phishguard_al_caer();

-- El tablero, al abrirse, lanza los refuerzos que ya cumplieron las 3 semanas.
create or replace function public.phishguard_activar_refuerzos()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.phishguard_org_id();
  v_camp record;
  v_emp uuid;
  v_n integer := 0;
begin
  if v_org is null then
    return 0;
  end if;

  for v_camp in
    select id, extra
    from public.campanas
    where organizacion_id = v_org
      and es_refuerzo
      and estado = 'programada'
      and fecha_inicio <= now()
  loop
    for v_emp in
      select jsonb_array_elements_text(coalesce(v_camp.extra->'pendientes', '[]'::jsonb))::uuid
    loop
      insert into public.eventos_simulacion (campana_id, empleado_id, token_unico)
      values (v_camp.id, v_emp, encode(gen_random_bytes(16), 'hex'))
      on conflict (campana_id, empleado_id) do nothing;
    end loop;

    update public.campanas
      set estado = 'en_proceso',
          extra = jsonb_set(coalesce(extra, '{}'::jsonb), '{pendientes}', '[]'::jsonb)
    where id = v_camp.id;

    v_n := v_n + 1;
  end loop;

  return v_n;
end;
$$;

-- Para probar el circuito sin esperar 21 días.
create or replace function public.phishguard_lanzar_refuerzo(p_campana_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org uuid := public.phishguard_org_id();
begin
  if v_org is null then
    raise exception 'No hay empresa';
  end if;

  update public.campanas
    set fecha_inicio = now()
  where id = p_campana_id
    and organizacion_id = v_org
    and es_refuerzo
    and estado = 'programada';

  return public.phishguard_activar_refuerzos();
end;
$$;

-- ---------------------------------------------------------------------------
-- Simulación pública: clic, datos, capacitación y "lo hiciste bien"
-- ---------------------------------------------------------------------------

create or replace function public.phishguard_ver_simulacion(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if p_token is null or length(p_token) < 8 then
    return null;
  end if;

  select
    split_part(e.nombre, ' ', 1) as nombre,
    ev.hizo_clic,
    ev.ingreso_datos,
    ev.completo_capacitacion,
    ev.vio_reconocimiento,
    c.canal,
    c.es_refuerzo,
    c.nombre_campana,
    p.titulo,
    p.asunto_mail,
    p.remitente_falso,
    p.cuerpo_html,
    p.categoria,
    p.nivel_dificultad,
    p.canal as canal_plantilla,
    p.metadata
  into r
  from public.eventos_simulacion ev
  join public.empleados e on e.id = ev.empleado_id
  join public.campanas c on c.id = ev.campana_id
  left join public.plantillas_phishing p on p.id = c.plantilla_id
  where ev.token_unico = p_token;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'nombre', r.nombre,
    'hizo_clic', r.hizo_clic,
    'ingreso_datos', r.ingreso_datos,
    'capacitado', r.completo_capacitacion,
    'reconocio', r.vio_reconocimiento,
    'canal', coalesce(r.canal, r.canal_plantilla, 'email'),
    'refuerzo', r.es_refuerzo,
    'titulo', r.titulo,
    'asunto', r.asunto_mail,
    'remitente', r.remitente_falso,
    'cuerpo', r.cuerpo_html,
    'categoria', r.categoria,
    'dificultad', r.nivel_dificultad,
    'leccion', coalesce(r.metadata->'lesson', '{}'::jsonb)
  );
end;
$$;

create or replace function public.phishguard_registrar(p_token text, p_evento text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_evento not in ('clic', 'datos', 'capacitacion', 'reconocimiento') then
    raise exception 'Evento inválido';
  end if;

  update public.eventos_simulacion
    set
      hizo_clic = hizo_clic or p_evento in ('clic', 'datos'),
      ingreso_datos = ingreso_datos or p_evento = 'datos',
      completo_capacitacion = completo_capacitacion or p_evento = 'capacitacion',
      vio_reconocimiento = vio_reconocimiento or p_evento = 'reconocimiento',
      fecha_evento = now()
  where token_unico = p_token;

  if not found then
    return null;
  end if;

  return public.phishguard_ver_simulacion(p_token);
end;
$$;

-- ---------------------------------------------------------------------------
-- SafeLink detecta, PhishGuard entrena con lo mismo
-- ---------------------------------------------------------------------------

create or replace function public.phishguard_inspirar_plantillas()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n integer;
begin
  insert into public.plantillas_phishing (
    titulo, asunto_mail, remitente_falso, cuerpo_html,
    nivel_dificultad, categoria, canal, amenaza_dominio, metadata
  )
  select
    format('Estafa real: %s', a.dominio),
    format('Reclamo pendiente — %s', a.dominio),
    format('Soporte %s', a.dominio),
    format(
      'Hola, te escribe %s. Tenés un reclamo pendiente. Entrá ahora o se vence el plazo: {link}',
      a.dominio
    ),
    'alto',
    'AMENAZA_REAL',
    'whatsapp',
    a.dominio,
    jsonb_build_object(
      'lesson', jsonb_build_object(
        'titulo', format('Esta estafa ya circuló: %s', a.dominio),
        'cuerpo', format(
          'SafeLink marcó %s en rojo%s. El mensaje apura y usa un nombre que parece conocido. Nadie de un sitio serio te pide por WhatsApp que entres a un link así.',
          a.dominio,
          case when a.motivo is not null then format(' (%s)', a.motivo) else '' end
        )
      )
    )
  from public.amenazas a
  where a.nivel = 'rojo'
    and not exists (
      select 1 from public.plantillas_phishing p where p.amenaza_dominio = a.dominio
    );

  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

create or replace function public.phishguard_al_reportar_amenaza()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.nivel = 'rojo' then
    perform public.phishguard_inspirar_plantillas();
  end if;
  return new;
end;
$$;

drop trigger if exists phishguard_al_reportar_amenaza on public.amenazas;

create trigger phishguard_al_reportar_amenaza
after insert or update of nivel
on public.amenazas
for each row
execute function public.phishguard_al_reportar_amenaza();

revoke all on function public.phishguard_programar_refuerzo(uuid, uuid) from public, anon;
revoke all on function public.phishguard_al_caer() from public, anon, authenticated;
revoke all on function public.phishguard_activar_refuerzos() from public, anon;
revoke all on function public.phishguard_lanzar_refuerzo(uuid) from public, anon;
revoke all on function public.phishguard_ver_simulacion(text) from public;
revoke all on function public.phishguard_registrar(text, text) from public;
revoke all on function public.phishguard_inspirar_plantillas() from public, anon;
revoke all on function public.phishguard_al_reportar_amenaza() from public, anon, authenticated;

grant execute on function public.phishguard_activar_refuerzos() to authenticated;
grant execute on function public.phishguard_lanzar_refuerzo(uuid) to authenticated;
grant execute on function public.phishguard_inspirar_plantillas() to authenticated;
grant execute on function public.phishguard_ver_simulacion(text) to anon, authenticated;
grant execute on function public.phishguard_registrar(text, text) to anon, authenticated;
