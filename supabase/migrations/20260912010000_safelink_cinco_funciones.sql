-- SafeLink: amenazas regionales, historial con Auth, cierre de reportes
-- y fichas para compartir. Tablas nuevas a proposito: las viejas
-- analisis_urls / reportes cuelgan de public.usuarios (integer) y no se
-- tocan, para no romper el SafeLink original.

create table if not exists public.amenazas (
  id uuid primary key default gen_random_uuid(),
  dominio text not null unique,
  nivel text not null check (nivel in ('verde', 'amarillo', 'rojo')),
  motivo text,
  origen text not null check (origen in ('safelink', 'reporte', 'safe_browsing', 'virustotal')),
  veces_reportado integer not null default 1 check (veces_reportado > 0),
  primera_vez timestamptz not null default now(),
  actualizada_en timestamptz not null default now()
);

create table if not exists public.safelink_analisis (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users (id) on delete cascade,
  url_analizada text not null,
  dominio text not null,
  nivel_riesgo text not null check (nivel_riesgo in ('verde', 'amarillo', 'rojo')),
  explicacion text,
  puntuacion_riesgo integer check (puntuacion_riesgo between 0 and 100),
  entrada text not null default 'web' check (entrada in ('web', 'pdf', 'correo', 'whatsapp')),
  fecha_analisis timestamptz not null default now()
);

create index if not exists safelink_analisis_usuario_idx
  on public.safelink_analisis (usuario_id, fecha_analisis desc);

create table if not exists public.safelink_reportes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references auth.users (id) on delete set null,
  dominio text not null,
  motivo text,
  estado text not null default 'revisado' check (estado in ('pendiente', 'revisado', 'descartado')),
  cierre text,
  origin_type text,
  fecha_reporte timestamptz not null default now()
);

create index if not exists safelink_reportes_usuario_idx
  on public.safelink_reportes (usuario_id, fecha_reporte desc);

create table if not exists public.safelink_compartidos (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  usuario_id uuid references auth.users (id) on delete set null,
  url_analizada text not null,
  dominio text not null,
  nivel_riesgo text not null check (nivel_riesgo in ('verde', 'amarillo', 'rojo')),
  explicacion text,
  puntuacion_riesgo integer,
  creado_en timestamptz not null default now()
);

alter table public.amenazas enable row level security;
alter table public.safelink_analisis enable row level security;
alter table public.safelink_reportes enable row level security;
alter table public.safelink_compartidos enable row level security;

drop policy if exists "amenazas: lectura publica" on public.amenazas;
create policy "amenazas: lectura publica"
on public.amenazas for select to anon, authenticated
using (true);

drop policy if exists "analisis: los mios" on public.safelink_analisis;
create policy "analisis: los mios"
on public.safelink_analisis for all to authenticated
using (usuario_id = auth.uid())
with check (usuario_id = auth.uid());

drop policy if exists "reportes: los mios" on public.safelink_reportes;
create policy "reportes: los mios"
on public.safelink_reportes for select to authenticated
using (usuario_id = auth.uid());

drop policy if exists "compartidos: crear los mios" on public.safelink_compartidos;
create policy "compartidos: crear los mios"
on public.safelink_compartidos for insert to authenticated
with check (usuario_id = auth.uid());

grant select on public.amenazas to anon, authenticated;
grant select, insert on public.safelink_analisis to authenticated;
grant select on public.safelink_reportes to authenticated;
grant insert on public.safelink_compartidos to authenticated;

-- Cierra el reporte en el momento: o era nuevo, o ya estaba, o lo pasamos a rojo.
create or replace function public.safelink_reportar(
  p_dominio text,
  p_motivo text default null,
  p_origin_type text default 'web'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_dominio text := lower(trim(p_dominio));
  v_nivel text;
  v_veces integer;
  v_codigo text;
  v_cierre text;
begin
  if v_uid is null then
    raise exception 'Tenés que entrar para reportar';
  end if;

  if v_dominio is null or length(v_dominio) < 3 then
    raise exception 'Falta el dominio';
  end if;

  select nivel, veces_reportado into v_nivel, v_veces
  from public.amenazas
  where dominio = v_dominio;

  if v_nivel is null then
    insert into public.amenazas (dominio, nivel, motivo, origen, veces_reportado)
    values (v_dominio, 'rojo', p_motivo, 'reporte', 1);
    v_codigo := 'nuevo';
    v_cierre := 'Recibimos tu reporte y lo marcamos en rojo en la base regional.';
  elsif v_nivel = 'rojo' then
    update public.amenazas
      set veces_reportado = veces_reportado + 1,
          actualizada_en = now(),
          motivo = coalesce(p_motivo, motivo)
    where dominio = v_dominio;
    v_codigo := 'ya_estaba';
    v_cierre := format(
      'Ya estaba en rojo: otras personas también lo reportaron (%s veces).',
      v_veces + 1
    );
  else
    update public.amenazas
      set nivel = 'rojo',
          veces_reportado = veces_reportado + 1,
          actualizada_en = now(),
          origen = 'reporte',
          motivo = coalesce(p_motivo, motivo)
    where dominio = v_dominio;
    v_codigo := 'marcado_rojo';
    v_cierre := format('Estaba marcado en %s y lo pasamos a rojo.', v_nivel);
  end if;

  insert into public.safelink_reportes (
    usuario_id, dominio, motivo, estado, cierre, origin_type
  ) values (
    v_uid, v_dominio, p_motivo, 'revisado', v_cierre, p_origin_type
  );

  return jsonb_build_object('codigo', v_codigo, 'cierre', v_cierre);
end;
$$;

create or replace function public.safelink_compartir(
  p_url text,
  p_dominio text,
  p_nivel text,
  p_explicacion text default null,
  p_puntuacion integer default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_token text;
begin
  if v_uid is null then
    raise exception 'Tenés que entrar para compartir';
  end if;

  if p_nivel is null or p_nivel not in ('verde', 'amarillo', 'rojo') then
    raise exception 'Nivel inválido';
  end if;

  v_token := encode(gen_random_bytes(9), 'hex');

  insert into public.safelink_compartidos (
    token, usuario_id, url_analizada, dominio, nivel_riesgo, explicacion, puntuacion_riesgo
  ) values (
    v_token, v_uid, p_url, lower(trim(p_dominio)), p_nivel, p_explicacion, p_puntuacion
  );

  return jsonb_build_object('token', v_token);
end;
$$;

-- Lo ve quien recibe el link, sin cuenta. Solo la ficha, nunca el autor.
create or replace function public.safelink_ver_compartido(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_fila record;
begin
  if p_token is null or length(p_token) < 8 then
    return null;
  end if;

  select url_analizada, dominio, nivel_riesgo, explicacion, puntuacion_riesgo, creado_en
  into v_fila
  from public.safelink_compartidos
  where token = p_token;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'url_analizada', v_fila.url_analizada,
    'dominio', v_fila.dominio,
    'nivel_riesgo', v_fila.nivel_riesgo,
    'explicacion', v_fila.explicacion,
    'puntuacion_riesgo', v_fila.puntuacion_riesgo,
    'creado_en', v_fila.creado_en
  );
end;
$$;

revoke all on function public.safelink_reportar(text, text, text) from public, anon;
revoke all on function public.safelink_compartir(text, text, text, text, integer) from public, anon;
revoke all on function public.safelink_ver_compartido(text) from public;

grant execute on function public.safelink_reportar(text, text, text) to authenticated;
grant execute on function public.safelink_compartir(text, text, text, text, integer) to authenticated;
grant execute on function public.safelink_ver_compartido(text) to anon, authenticated;
