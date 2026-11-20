# 🐾 Clínica Pet · Controle de Estoque & Clínica

Sistema **só de estoque**: sem vendas, sem caixa, sem preço de venda.

> Projeto de portfólio. Nome da clínica, logo e dados de contato são fictícios. É uma versão enxuta do [controle-estoque-pet](https://github.com/devthiagoferreira96-hue/controle-estoque-pet), focada em descobrir para onde a mercadoria vai.
>
> **Destaques técnicos:** API REST em NestJS com JWT e papéis, saldos do Estoque Geral e da Clínica alterados só por movimentações, inventário que transforma diferença de contagem em registro de sumiço, log de auditoria **imutável** por trigger no PostgreSQL e front-end Next.js instalável como PWA.

Ele controla o que entra, o que fica no **Estoque Geral**, o que vai para a **Clínica**, o que a clínica usa e o que se perde ou some, sempre com o **responsável e o motivo** registrados.

| Camada | Tecnologia |
|---|---|
| API REST | **NestJS 10** + **TypeORM** |
| Banco de dados | **Supabase** (PostgreSQL) + Supabase Storage (fotos) |
| Frontend | **Next.js 15 (App Router)** + **Tailwind CSS** |
| App | **PWA**: instala no celular, tablet e computador |

---

## ✅ O que o sistema faz

**Produtos**
- Categorias: **Farmácia (medicamentos), Rações, Acessórios, Limpeza, Idex e Insumos**
- Foto, nome, marca, descrição, unidade (UN, KG, L, CX, AMP, DOSE…), código de barras
- **Valor unitário pago**, usado para calcular quanto vale o estoque, o consumo e as perdas
- Estoque mínimo, com aviso de "estoque baixo"

**2 saldos independentes por produto**
- 🏬 **Estoque Geral** · 🩺 **Clínica**
- Os saldos **nunca** são editados à mão. Só mudam por movimentações:
  - 📥 **Entrada**: chegou do fornecedor (com NF/motivo)
  - 🔁 **Transferência**: Estoque → Clínica ou Clínica → Estoque
  - 📤 **Uso na clínica**: consumido em atendimento (paciente/prontuário no motivo)
  - 🗑️ **Perda**: vencido, quebrado, avariado
  - 📋 **Contagem / Inventário**: você digita o que contou, e a diferença vira registro de **sumiço**
- O banco **impede saldo negativo**

**🔍 Log de auditoria**
- Cada movimentação registra **responsável, motivo (obrigatório), data/hora, quantidade, de onde → para onde e os saldos depois**
- **Imutável**: um trigger no banco bloqueia `UPDATE`, `DELETE` e `TRUNCATE` no log
- Filtros por tipo, local, funcionário e período

**📊 Relatórios (administrador)**
- No período: valor que **entrou**, que foi **enviado à clínica**, que foi **usado na clínica**, **perdido** e que **sumiu**
- Por produto, por categoria e **por funcionário**
- Dica de controle: se vai muito material para a clínica e pouco uso é registrado, algo está saindo sem controle

**👥 Equipe**
- **Administrador**: vê valores, edita produtos, vê relatórios e gerencia usuários
- **Funcionário**: cadastra, dá entrada, transfere, registra uso/perda e faz contagem

---

## 🚀 Como rodar

> Este sistema usa **portas diferentes** do sistema de vendas (API **3334**, site **3001**), então os dois podem rodar ao mesmo tempo no mesmo computador.

### 1) Banco no Supabase
Use um **projeto Supabase novo**, separado do sistema de vendas, porque as tabelas têm os mesmos nomes.
1. Crie o projeto (região São Paulo) e anote a senha do banco.
2. **SQL Editor → New query**: cole todo o [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
3. Pegue os dados para o `.env`:
   - `DATABASE_URL`: botão **Connect** (topo da página) → **Session pooler** → copie e troque `[YOUR-PASSWORD]` pela senha
   - `SUPABASE_URL`: **Project Settings → Data API**, o endereço sem o `/rest/v1/`
   - `SUPABASE_SERVICE_ROLE_KEY`: **Project Settings → API Keys** → chave `service_role` (ou uma *secret key*)

### 2) API
```bash
cd backend
cp .env.example .env      # Windows: copy .env.example .env
# preencha o .env
npm install
npm run start:dev
```
Ela sobe em `http://localhost:3334/api` e cria o administrador definido em `ADMIN_EMAIL` / `ADMIN_SENHA`.

### 3) Site / App
```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```
Acesse **http://localhost:3001**, entre com o administrador e troque a senha em **Minha conta**.

### 4) Instalar como app 📱
Android (Chrome): menu ⋮ → **Instalar app** · iPhone (Safari): Compartilhar → **Adicionar à Tela de Início**.
A instalação exige **HTTPS** quando não é `localhost`. Publique o frontend na **Vercel** e a API no **Render** ou **Railway**.

---

## 🧭 Rotina recomendada
1. Chegou mercadoria → **Entrada** no Estoque Geral, com o nº da NF.
2. Levou para a clínica → **Transferir** Estoque → Clínica.
3. Usou em atendimento → **Uso na clínica**, com paciente/prontuário.
4. Toda semana → **Contagem** dos itens mais caros (medicamentos, Idex) nos dois locais.
5. Todo mês → **Relatórios**: o que sumiu, onde e com quem.

---

## 🔌 Endpoints (prefixo `/api`, com token JWT)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login` | Login |
| GET | `/produtos?busca=&categoria=&comSaldoEm=&abaixoMinimo=` | Lista produtos |
| POST | `/produtos` | Cadastra (com entrada inicial opcional) |
| PATCH | `/produtos/:id` | Edita dados (admin), **não** altera saldos |
| POST | `/produtos/:id/imagem` | Foto (multipart, campo `imagem`) |
| POST | `/movimentacoes/entrada` | Entrada |
| POST | `/movimentacoes/transferencia` | Estoque ⇄ Clínica |
| POST | `/movimentacoes/saida` | Uso na clínica / perda |
| POST | `/movimentacoes/ajuste` | Contagem de inventário |
| GET | `/movimentacoes` | Log de auditoria |
| GET | `/relatorios/dashboard` | Painel inicial |
| GET | `/relatorios/periodo?inicio=&fim=` | Entradas, uso, perdas e sumiço (admin) |
| GET/POST/PATCH | `/usuarios` | Equipe (admin) |
