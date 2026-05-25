-- Habilita extensão de UUID
create extension if not exists "uuid-ossp";

-- Tabela de categorias
create table categorias (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  nome text not null,
  emoji text not null default '📌',
  tipo text not null check (tipo in ('receita', 'despesa')),
  criado_em timestamptz default now()
);

-- Tabela de lançamentos
create table lancamentos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  descricao text not null,
  valor numeric(12,2) not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  data date not null,
  parc_id text,
  parc_n integer,
  parc_total integer,
  criado_em timestamptz default now()
);

-- Tabela de fixos (custos fixos mensais)
create table fixos (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null,
  descricao text not null,
  valor numeric(12,2) not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  categoria text not null,
  dia_vencimento integer not null default 1,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- RLS (segurança por usuário)
alter table categorias enable row level security;
alter table lancamentos enable row level security;
alter table fixos enable row level security;

create policy "usuario ve suas categorias" on categorias for all using (auth.uid() = user_id);
create policy "usuario ve seus lancamentos" on lancamentos for all using (auth.uid() = user_id);
create policy "usuario ve seus fixos" on fixos for all using (auth.uid() = user_id);

-- Categorias padrão (inseridas automaticamente no primeiro login via app)
