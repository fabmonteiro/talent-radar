-- TalentRadar Database Schema
-- Run this in the Supabase SQL editor to set up the schema and seed data.

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- Catalog tables
-- ─────────────────────────────────────────────

create table if not exists skills_catalog (
  id          uuid        primary key default gen_random_uuid(),
  nome        text        not null,
  categoria   text        not null,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists idiomas_catalog (
  id          uuid        primary key default gen_random_uuid(),
  nome        text        not null,
  codigo      text        not null,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists certificacoes_catalog (
  id          uuid        primary key default gen_random_uuid(),
  nome        text        not null,
  emissor     text        not null,
  ativo       boolean     not null default true,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- Core entity
-- ─────────────────────────────────────────────

create table if not exists colaboradores (
  id                uuid        primary key default gen_random_uuid(),
  nome              text        not null,
  idade             int,
  seniority         text,
  anos_experiencia  int,
  bio               text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-update updated_at on row change
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger colaboradores_set_updated_at
  before update on colaboradores
  for each row execute function set_updated_at();

-- ─────────────────────────────────────────────
-- Junction tables
-- ─────────────────────────────────────────────

create table if not exists colaborador_skills (
  colaborador_id  uuid  not null references colaboradores(id) on delete cascade,
  skill_id        uuid  not null references skills_catalog(id) on delete cascade,
  nivel           text,
  primary key (colaborador_id, skill_id)
);

create table if not exists colaborador_idiomas (
  colaborador_id  uuid  not null references colaboradores(id) on delete cascade,
  idioma_id       uuid  not null references idiomas_catalog(id) on delete cascade,
  nivel           text,
  primary key (colaborador_id, idioma_id)
);

create table if not exists colaborador_certificacoes (
  colaborador_id  uuid  not null references colaboradores(id) on delete cascade,
  cert_id         uuid  not null references certificacoes_catalog(id) on delete cascade,
  ano             text,
  primary key (colaborador_id, cert_id)
);

-- ─────────────────────────────────────────────
-- Detail tables
-- ─────────────────────────────────────────────

create table if not exists experiencias (
  id              uuid  primary key default gen_random_uuid(),
  colaborador_id  uuid  not null references colaboradores(id) on delete cascade,
  empresa         text,
  role            text,
  data_inicio     text,
  data_fim        text,
  descricao       text
);

create table if not exists projetos (
  id              uuid  primary key default gen_random_uuid(),
  colaborador_id  uuid  not null references colaboradores(id) on delete cascade,
  nome            text,
  descricao       text,
  tecnologias     text
);

-- ─────────────────────────────────────────────
-- Seed data – skills_catalog
-- ─────────────────────────────────────────────

insert into skills_catalog (nome, categoria) values
  ('Python',                   'Linguagem'),
  ('Java',                     'Linguagem'),
  ('CrewAI',                   'AI Framework'),
  ('Google ADK',               'AI Framework'),
  ('LangGraph',                'AI Framework'),
  ('FastAPI',                  'Framework'),
  ('PowerBI',                  'Analytics'),
  ('Google Cloud Platform',    'Cloud'),
  ('Azure',                    'Cloud'),
  ('AWS',                      'Cloud'),
  ('Vertex AI',                'AI / ML'),
  ('Cloud Run',                'Cloud'),
  ('BigQuery',                 'Data'),
  ('CV',                       'AI / ML');

-- ─────────────────────────────────────────────
-- Seed data – idiomas_catalog
-- ─────────────────────────────────────────────

insert into idiomas_catalog (nome, codigo) values
  ('Português', 'pt'),
  ('Inglês',    'en'),
  ('Espanhol',  'es'),
  ('Francês',   'fr'),
  ('Alemão',    'de'),
  ('Mandarim',  'zh');

-- ─────────────────────────────────────────────
-- Seed data – certificacoes_catalog
-- ─────────────────────────────────────────────

insert into certificacoes_catalog (nome, emissor) values
  ('Cloud Digital Leader',    'Google'),
  ('Generative AI Leader',    'Google');
