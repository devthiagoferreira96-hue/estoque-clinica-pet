-- =====================================================================
--  CLÍNICA PET - Controle de ESTOQUE e CLÍNICA
--  Esquema do banco (PostgreSQL / Supabase)
--  Rode este arquivo inteiro no Supabase > SQL Editor > New query > Run
--  (Use um projeto Supabase separado do sistema de vendas)
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tipos ----------
do $$ begin
  create type categoria_produto as enum ('FARMACIA','RACOES','ACESSORIOS','LIMPEZA','IDEX','INSUMOS');
exception when duplicate_object then null; end $$;

do $$ begin
  create type local_estoque as enum ('ESTOQUE','CLINICA');
exception when duplicate_object then null; end $$;

do $$ begin
  create type tipo_movimentacao as enum (
    'ENTRADA',            -- mercadoria chegou do fornecedor
    'TRANSFERENCIA',      -- mudou de lugar (Estoque <-> Clínica)
    'USO_CLINICA',        -- consumido em atendimento/procedimento
    'PERDA',              -- vencido, quebrado, avariado
    'AJUSTE_INVENTARIO'   -- contagem física diferente do sistema
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type papel_usuario as enum ('ADMIN','FUNCIONARIO');
exception when duplicate_object then null; end $$;

-- ---------- Usuários (responsáveis) ----------
create table if not exists usuarios (
  id          uuid primary key default gen_random_uuid(),
  nome        varchar(120) not null,
  email       varchar(160) not null unique,
  senha_hash  varchar(200) not null,
  papel       papel_usuario not null default 'FUNCIONARIO',
  ativo       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Produtos (2 saldos independentes) ----------
create table if not exists produtos (
  id              uuid primary key default gen_random_uuid(),
  nome            varchar(160) not null,
  marca           varchar(120),
  descricao       text,
  categoria       categoria_produto not null,
  unidade         varchar(10) not null default 'UN',
  codigo_barras   varchar(60) unique,
  imagem_url      text,
  custo_unitario  numeric(12,2) not null default 0 check (custo_unitario >= 0),
  saldo_estoque   numeric(12,3) not null default 0 check (saldo_estoque >= 0),
  saldo_clinica   numeric(12,3) not null default 0 check (saldo_clinica >= 0),
  estoque_minimo  numeric(12,3) not null default 0 check (estoque_minimo >= 0),
  ativo           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_produtos_categoria on produtos(categoria);
create index if not exists idx_produtos_nome on produtos(lower(nome));

-- ---------- LOG DE AUDITORIA (movimentações) ----------
create table if not exists movimentacoes (
  id               uuid primary key default gen_random_uuid(),
  produto_id       uuid not null references produtos(id),
  tipo             tipo_movimentacao not null,
  local_origem     local_estoque,
  local_destino    local_estoque,
  quantidade       numeric(12,3) not null check (quantidade > 0),
  custo_unitario   numeric(12,2) not null default 0,
  motivo           text not null check (length(trim(motivo)) >= 3),
  responsavel_id   uuid not null references usuarios(id),
  saldo_estoque_apos numeric(12,3) not null,
  saldo_clinica_apos numeric(12,3) not null,
  created_at       timestamptz not null default now(),
  check (local_origem is not null or local_destino is not null),
  check (local_origem is distinct from local_destino)
);
create index if not exists idx_mov_produto on movimentacoes(produto_id, created_at desc);
create index if not exists idx_mov_created on movimentacoes(created_at desc);
create index if not exists idx_mov_responsavel on movimentacoes(responsavel_id);

-- O log é IMUTÁVEL: ninguém consegue alterar ou apagar um registro, nem pelo sistema.
create or replace function bloquear_alteracao_log() returns trigger as $$
begin
  raise exception 'O log de auditoria (movimentacoes) não pode ser alterado nem apagado.';
end; $$ language plpgsql;

drop trigger if exists trg_movimentacoes_imutavel on movimentacoes;
create trigger trg_movimentacoes_imutavel
  before update or delete on movimentacoes
  for each row execute function bloquear_alteracao_log();

drop trigger if exists trg_movimentacoes_sem_truncate on movimentacoes;
create trigger trg_movimentacoes_sem_truncate
  before truncate on movimentacoes
  for each statement execute function bloquear_alteracao_log();

-- ---------- Segurança Supabase ----------
-- O sistema acessa o banco pela API NestJS (conexão direta).
-- RLS ligado sem políticas = ninguém lê/escreve pela API pública do Supabase (chave anon).
alter table usuarios      enable row level security;
alter table produtos      enable row level security;
alter table movimentacoes enable row level security;

-- ---------- Bucket de imagens (Supabase Storage) ----------
do $$ begin
  insert into storage.buckets (id, name, public) values ('produtos','produtos', true)
  on conflict (id) do nothing;
exception when others then
  raise notice 'Bucket não criado (provavelmente não é Supabase): %', sqlerrm;
end $$;
