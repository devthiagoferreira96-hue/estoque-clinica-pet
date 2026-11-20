import { BadRequestException, Controller, Get, Injectable, Module, Query } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Roles } from '../common/auth.decorators';
import { hojeNoFuso, Papel } from '../common/enums';

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function periodo(inicio?: string, fim?: string) {
  const hoje = hojeNoFuso();
  const ini = inicio || hoje.slice(0, 8) + '01'; // padrão: mês atual
  const f = fim || hoje;
  if (!DATA.test(ini) || !DATA.test(f)) throw new BadRequestException('Datas no formato AAAA-MM-DD');
  return { ini, f };
}

@Injectable()
export class RelatoriosService {
  constructor(@InjectDataSource() private ds: DataSource) {}
  private tz = () => process.env.TZ_CLINICA || 'America/Sao_Paulo';

  /** Painel inicial */
  async dashboard() {
    const [saldos] = await this.ds.query(`
      select count(*)::int as "produtos",
             coalesce(sum(saldo_estoque),0)::float as "qtdEstoque",
             coalesce(sum(saldo_clinica),0)::float as "qtdClinica",
             coalesce(sum(saldo_estoque*custo_unitario),0)::float as "valorEstoque",
             coalesce(sum(saldo_clinica*custo_unitario),0)::float as "valorClinica"
        from produtos where ativo`);
    const porCategoria = await this.ds.query(`
      select categoria, count(*)::int as "produtos",
             coalesce(sum(saldo_estoque),0)::float as "estoque",
             coalesce(sum(saldo_clinica),0)::float as "clinica",
             coalesce(sum((saldo_estoque+saldo_clinica)*custo_unitario),0)::float as "valorCusto"
        from produtos where ativo group by categoria order by categoria`);
    const abaixoMinimo = await this.ds.query(`
      select id, nome, marca, categoria, unidade, imagem_url as "imagemUrl",
             saldo_estoque::float as "saldoEstoque", saldo_clinica::float as "saldoClinica",
             estoque_minimo::float as "estoqueMinimo"
        from produtos
       where ativo and estoque_minimo > 0 and (saldo_estoque+saldo_clinica) <= estoque_minimo
       order by nome limit 30`);
    const [hoje] = await this.ds.query(
      `select count(*) filter (where tipo='ENTRADA')::int as "entradas",
              count(*) filter (where tipo='TRANSFERENCIA')::int as "transferencias",
              count(*) filter (where tipo='USO_CLINICA')::int as "usosClinica",
              count(*) filter (where tipo='PERDA' or (tipo='AJUSTE_INVENTARIO' and local_origem is not null))::int as "perdas"
         from movimentacoes where (created_at at time zone $1)::date = $2::date`,
      [this.tz(), hojeNoFuso()],
    );
    const ultimas = await this.ds.query(`
      select m.id, m.tipo, m.local_origem as "localOrigem", m.local_destino as "localDestino",
             m.quantidade::float, m.motivo, m.created_at as "createdAt",
             p.nome as "produto", u.nome as "responsavel"
        from movimentacoes m join produtos p on p.id=m.produto_id join usuarios u on u.id=m.responsavel_id
       order by m.created_at desc limit 12`);
    return { saldos, porCategoria, abaixoMinimo, hoje, ultimasMovimentacoes: ultimas };
  }

  /**
   * Resumo do período por produto: quanto entrou, quanto foi para a clínica,
   * quanto a clínica usou, quanto se perdeu e quanto SUMIU (falta na contagem).
   */
  async periodo(inicio?: string, fim?: string) {
    const { ini, f } = periodo(inicio, fim);
    const params = [ini, f, this.tz()];
    const filtro = `(m.created_at at time zone $3)::date between $1::date and $2::date`;
    const valor = (cond: string) =>
      `coalesce(sum(m.quantidade * m.custo_unitario) filter (where ${cond}),0)::float`;
    const qtdF = (cond: string) => `coalesce(sum(m.quantidade) filter (where ${cond}),0)::float`;
    const SUMICO = `m.tipo='AJUSTE_INVENTARIO' and m.local_origem is not null`;
    const SOBRA = `m.tipo='AJUSTE_INVENTARIO' and m.local_destino is not null`;

    const [totais] = await this.ds.query(
      `select ${valor(`m.tipo='ENTRADA'`)} as "entradas",
              ${valor(`m.tipo='TRANSFERENCIA' and m.local_destino='CLINICA'`)} as "enviadoClinica",
              ${valor(`m.tipo='USO_CLINICA'`)} as "usoClinica",
              ${valor(`m.tipo='PERDA'`)} as "perda",
              ${valor(SUMICO)} as "sumico",
              ${valor(SOBRA)} as "sobra"
         from movimentacoes m where ${filtro}`,
      params,
    );
    const porProduto = await this.ds.query(
      `select p.id as "produtoId", p.nome, p.marca, p.categoria, p.unidade,
              ${qtdF(`m.tipo='ENTRADA'`)} as "entradas",
              ${qtdF(`m.tipo='TRANSFERENCIA' and m.local_destino='CLINICA'`)} as "enviadoClinica",
              ${qtdF(`m.tipo='USO_CLINICA'`)} as "usoClinica",
              ${qtdF(`m.tipo='PERDA'`)} as "perda",
              ${qtdF(SUMICO)} as "sumico",
              ${valor(`m.tipo='USO_CLINICA'`)} as "valorUso",
              ${valor(`m.tipo='PERDA' or (${SUMICO})`)} as "prejuizo"
         from movimentacoes m join produtos p on p.id=m.produto_id
        where ${filtro}
        group by p.id, p.nome, p.marca, p.categoria, p.unidade
        order by "prejuizo" desc, "usoClinica" desc, p.nome`,
      params,
    );
    const porCategoria = await this.ds.query(
      `select p.categoria,
              ${valor(`m.tipo='ENTRADA'`)} as "entradas",
              ${valor(`m.tipo='USO_CLINICA'`)} as "usoClinica",
              ${valor(`m.tipo='PERDA'`)} as "perda",
              ${valor(SUMICO)} as "sumico"
         from movimentacoes m join produtos p on p.id=m.produto_id
        where ${filtro}
        group by p.categoria order by p.categoria`,
      params,
    );
    const porResponsavel = await this.ds.query(
      `select u.id as "usuarioId", u.nome,
              count(*) filter (where m.tipo='ENTRADA')::int as "entradas",
              count(*) filter (where m.tipo='TRANSFERENCIA')::int as "transferencias",
              count(*) filter (where m.tipo='USO_CLINICA')::int as "usosClinica",
              count(*) filter (where m.tipo='PERDA')::int as "perdas",
              count(*) filter (where ${SUMICO})::int as "ajustesNegativos",
              ${valor(`m.tipo='PERDA' or (${SUMICO})`)} as "prejuizo"
         from movimentacoes m join usuarios u on u.id=m.responsavel_id
        where ${filtro}
        group by u.id, u.nome order by "prejuizo" desc, u.nome`,
      params,
    );
    return { inicio: ini, fim: f, totais, porProduto, porCategoria, porResponsavel };
  }
}

@Controller('relatorios')
export class RelatoriosController {
  constructor(private service: RelatoriosService) {}

  @Get('dashboard')
  dashboard() {
    return this.service.dashboard();
  }

  @Roles(Papel.ADMIN)
  @Get('periodo')
  periodo(@Query('inicio') inicio?: string, @Query('fim') fim?: string) {
    return this.service.periodo(inicio, fim);
  }
}

@Module({
  providers: [RelatoriosService],
  controllers: [RelatoriosController],
})
export class RelatoriosModule {}
