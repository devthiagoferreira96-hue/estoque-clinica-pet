import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Post,
  Query,
} from '@nestjs/common';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, Min, MinLength } from 'class-validator';
import { DataSource, EntityManager } from 'typeorm';
import { UsuarioAtual, UsuarioLogado } from '../common/auth.decorators';
import { CAMPO_SALDO, Local, NOME_LOCAL, TipoMovimentacao } from '../common/enums';
import { r2, r3 } from '../common/money';
import { Movimentacao, Produto } from '../entities';

// ------------------------------------------------------------------ DTOs
const MOTIVO_MSG = { message: 'Informe o motivo (mínimo 3 caracteres)' };

export class EntradaDto {
  @IsUUID() produtoId: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantidade: number;
  @IsOptional() @IsEnum(Local) local?: Local;
  /** Se informado, atualiza o custo unitário (valor pago) do produto */
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) custoUnitario?: number;
  @IsString() @MinLength(3, MOTIVO_MSG) motivo: string;
}

export class TransferenciaDto {
  @IsUUID() produtoId: string;
  @IsEnum(Local) origem: Local;
  @IsEnum(Local) destino: Local;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantidade: number;
  @IsString() @MinLength(3, MOTIVO_MSG) motivo: string;
}

export class SaidaDto {
  @IsUUID() produtoId: string;
  @IsEnum(Local) local: Local;
  @IsIn([TipoMovimentacao.USO_CLINICA, TipoMovimentacao.PERDA]) tipo: TipoMovimentacao;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.001) quantidade: number;
  @IsString() @MinLength(3, MOTIVO_MSG) motivo: string;
}

export class AjusteDto {
  @IsUUID() produtoId: string;
  @IsEnum(Local) local: Local;
  /** Quantidade que foi CONTADA fisicamente na prateleira */
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) saldoContado: number;
  @IsString() @MinLength(3, MOTIVO_MSG) motivo: string;
}

export class FiltroMovDto {
  @IsOptional() @IsUUID() produtoId?: string;
  @IsOptional() @IsEnum(TipoMovimentacao) tipo?: TipoMovimentacao;
  @IsOptional() @IsEnum(Local) local?: Local;
  @IsOptional() @IsUUID() responsavelId?: string;
  @IsOptional() @IsString() inicio?: string; // YYYY-MM-DD
  @IsOptional() @IsString() fim?: string; // YYYY-MM-DD
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pagina?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) porPagina?: number;
}

// ------------------------------------------------------------------ Service
export interface RegistroMov {
  produto: Produto; // precisa estar BLOQUEADO (lock) na transação
  tipo: TipoMovimentacao;
  origem: Local | null; // de onde sai (null = vem de fora, ex.: fornecedor)
  destino: Local | null; // para onde vai (null = sai do sistema, ex.: uso/perda)
  quantidade: number;
  motivo: string;
  responsavelId: string;
}

@Injectable()
export class MovimentacoesService {
  constructor(@InjectDataSource() private ds: DataSource) {}

  /** Busca o produto travando a linha (evita duas pessoas mexerem no mesmo saldo ao mesmo tempo) */
  async travarProduto(m: EntityManager, id: string): Promise<Produto> {
    const p = await m.getRepository(Produto).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return p;
  }

  /**
   * ÚNICO lugar do sistema que altera saldos.
   * Toda alteração gera obrigatoriamente uma linha no log de auditoria.
   */
  async registrar(m: EntityManager, r: RegistroMov): Promise<Movimentacao> {
    const qtd = r3(r.quantidade);
    if (qtd <= 0) throw new BadRequestException('Quantidade deve ser maior que zero');
    if (r.origem && r.destino && r.origem === r.destino) {
      throw new BadRequestException('Origem e destino não podem ser o mesmo local');
    }
    const p = r.produto;
    if (r.origem) {
      const campo = CAMPO_SALDO[r.origem];
      if (p[campo] < qtd) {
        throw new BadRequestException(
          `Saldo insuficiente de "${p.nome}" em ${NOME_LOCAL[r.origem]}: disponível ${p[campo]}, solicitado ${qtd}`,
        );
      }
      p[campo] = r3(p[campo] - qtd);
    }
    if (r.destino) {
      const campo = CAMPO_SALDO[r.destino];
      p[campo] = r3(p[campo] + qtd);
    }
    await m.getRepository(Produto).update(p.id, {
      saldoEstoque: p.saldoEstoque,
      saldoClinica: p.saldoClinica,
    });
    const mov = m.getRepository(Movimentacao).create({
      produtoId: p.id,
      tipo: r.tipo,
      localOrigem: r.origem,
      localDestino: r.destino,
      quantidade: qtd,
      custoUnitario: p.custoUnitario,
      motivo: r.motivo.trim(),
      responsavelId: r.responsavelId,
      saldoEstoqueApos: p.saldoEstoque,
      saldoClinicaApos: p.saldoClinica,
    });
    return m.getRepository(Movimentacao).save(mov);
  }

  entrada(dto: EntradaDto, u: UsuarioLogado) {
    return this.ds.transaction(async (m) => {
      const p = await this.travarProduto(m, dto.produtoId);
      if (dto.custoUnitario !== undefined && r2(dto.custoUnitario) !== p.custoUnitario) {
        p.custoUnitario = r2(dto.custoUnitario);
        await m.getRepository(Produto).update(p.id, { custoUnitario: p.custoUnitario });
      }
      return this.registrar(m, {
        produto: p,
        tipo: TipoMovimentacao.ENTRADA,
        origem: null,
        destino: dto.local ?? Local.ESTOQUE,
        quantidade: dto.quantidade,
        motivo: dto.motivo,
        responsavelId: u.id,
      });
    });
  }

  transferir(dto: TransferenciaDto, u: UsuarioLogado) {
    return this.ds.transaction(async (m) => {
      const p = await this.travarProduto(m, dto.produtoId);
      return this.registrar(m, {
        produto: p,
        tipo: TipoMovimentacao.TRANSFERENCIA,
        origem: dto.origem,
        destino: dto.destino,
        quantidade: dto.quantidade,
        motivo: dto.motivo,
        responsavelId: u.id,
      });
    });
  }

  saida(dto: SaidaDto, u: UsuarioLogado) {
    return this.ds.transaction(async (m) => {
      const p = await this.travarProduto(m, dto.produtoId);
      return this.registrar(m, {
        produto: p,
        tipo: dto.tipo,
        origem: dto.local,
        destino: null,
        quantidade: dto.quantidade,
        motivo: dto.motivo,
        responsavelId: u.id,
      });
    });
  }

  /** Inventário: compara o que foi contado com o sistema e registra a diferença */
  ajuste(dto: AjusteDto, u: UsuarioLogado) {
    return this.ds.transaction(async (m) => {
      const p = await this.travarProduto(m, dto.produtoId);
      const atual = p[CAMPO_SALDO[dto.local]];
      const diff = r3(dto.saldoContado - atual);
      if (diff === 0) throw new BadRequestException('A contagem confere com o sistema. Nada a ajustar.');
      const motivo = `${dto.motivo.trim()} (sistema: ${atual} | contado: ${dto.saldoContado} | diferença: ${diff > 0 ? '+' : ''}${diff})`;
      return this.registrar(m, {
        produto: p,
        tipo: TipoMovimentacao.AJUSTE_INVENTARIO,
        origem: diff < 0 ? dto.local : null,
        destino: diff > 0 ? dto.local : null,
        quantidade: Math.abs(diff),
        motivo,
        responsavelId: u.id,
      });
    });
  }

  async listar(f: FiltroMovDto) {
    const pagina = f.pagina ?? 1;
    const porPagina = f.porPagina ?? 50;
    const tz = process.env.TZ_CLINICA || 'America/Sao_Paulo';
    const q = this.ds
      .getRepository(Movimentacao)
      .createQueryBuilder('m')
      .leftJoin('m.produto', 'p')
      .addSelect(['p.id', 'p.nome', 'p.marca', 'p.categoria', 'p.unidade', 'p.imagemUrl'])
      .leftJoin('m.responsavel', 'u')
      .addSelect(['u.id', 'u.nome'])
      .orderBy('m.createdAt', 'DESC')
      .skip((pagina - 1) * porPagina)
      .take(porPagina);
    if (f.produtoId) q.andWhere('m.produto_id = :pid', { pid: f.produtoId });
    if (f.tipo) q.andWhere('m.tipo = :tipo', { tipo: f.tipo });
    if (f.local) q.andWhere('(m.local_origem = :loc OR m.local_destino = :loc)', { loc: f.local });
    if (f.responsavelId) q.andWhere('m.responsavel_id = :rid', { rid: f.responsavelId });
    if (f.inicio) q.andWhere(`(m.created_at AT TIME ZONE :tz)::date >= :ini`, { tz, ini: f.inicio });
    if (f.fim) q.andWhere(`(m.created_at AT TIME ZONE :tz)::date <= :fim`, { tz, fim: f.fim });
    const [itens, total] = await q.getManyAndCount();
    return { itens, total, pagina, porPagina };
  }
}

// ------------------------------------------------------------------ Controller
@Controller('movimentacoes')
export class MovimentacoesController {
  constructor(private service: MovimentacoesService) {}

  @Get()
  listar(@Query() f: FiltroMovDto) {
    return this.service.listar(f);
  }

  @Post('entrada')
  entrada(@Body() dto: EntradaDto, @UsuarioAtual() u: UsuarioLogado) {
    return this.service.entrada(dto, u);
  }

  @Post('transferencia')
  transferir(@Body() dto: TransferenciaDto, @UsuarioAtual() u: UsuarioLogado) {
    return this.service.transferir(dto, u);
  }

  @Post('saida')
  saida(@Body() dto: SaidaDto, @UsuarioAtual() u: UsuarioLogado) {
    return this.service.saida(dto, u);
  }

  @Post('ajuste')
  ajuste(@Body() dto: AjusteDto, @UsuarioAtual() u: UsuarioLogado) {
    return this.service.ajuste(dto, u);
  }
  // Não existe PUT/PATCH/DELETE: o log de auditoria é imutável.
}

@Module({
  imports: [TypeOrmModule.forFeature([Movimentacao, Produto])],
  providers: [MovimentacoesService],
  controllers: [MovimentacoesController],
  exports: [MovimentacoesService],
})
export class MovimentacoesModule {}
