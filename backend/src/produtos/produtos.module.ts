import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectDataSource, TypeOrmModule } from '@nestjs/typeorm';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';
import { DataSource } from 'typeorm';
import { Roles, UsuarioAtual, UsuarioLogado } from '../common/auth.decorators';
import { Categoria, Local, Papel, TipoMovimentacao } from '../common/enums';
import { r2 } from '../common/money';
import { Produto } from '../entities';
import { MovimentacoesModule, MovimentacoesService } from '../movimentacoes/movimentacoes.module';

const vazioParaNull = ({ value }: { value: any }) => (value === '' ? null : value);

// ------------------------------------------------------------------ DTOs
class ProdutoBaseDto {
  @IsOptional() @IsString() @MaxLength(120) @Transform(vazioParaNull) marca?: string | null;
  @IsOptional() @IsString() @Transform(vazioParaNull) descricao?: string | null;
  @IsOptional() @IsString() @MaxLength(10) unidade?: string;
  @IsOptional() @IsString() @MaxLength(60) @Transform(vazioParaNull) codigoBarras?: string | null;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) estoqueMinimo?: number;
}

class CriarProdutoDto extends ProdutoBaseDto {
  @IsString() @MinLength(2) @MaxLength(160) nome: string;
  @IsEnum(Categoria, { message: 'Categoria inválida' }) categoria: Categoria;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) custoUnitario: number;
  /** Quantidade que está chegando agora (gera uma ENTRADA no log) */
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0) quantidadeInicial?: number;
  @IsOptional() @IsEnum(Local) localInicial?: Local;
  @IsOptional() @IsString() motivoEntrada?: string;
}

class AtualizarProdutoDto extends ProdutoBaseDto {
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) nome?: string;
  @IsOptional() @IsEnum(Categoria) categoria?: Categoria;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) custoUnitario?: number;
  @IsOptional() @IsBoolean() ativo?: boolean;
  // Saldos NÃO podem ser alterados aqui: só por movimentações (que geram log).
}

class FiltroProdutoDto {
  @IsOptional() @IsString() busca?: string;
  @IsOptional() @IsEnum(Categoria) categoria?: Categoria;
  @IsOptional() @IsEnum(Local) comSaldoEm?: Local;
  @IsOptional() @Transform(({ obj, key }) => obj[key] === 'true' || obj[key] === true) @IsBoolean() inativos?: boolean;
  @IsOptional() @Transform(({ obj, key }) => obj[key] === 'true' || obj[key] === true) @IsBoolean() abaixoMinimo?: boolean;
}

// ------------------------------------------------------------------ Storage de imagens
@Injectable()
export class ImagemStorage {
  private supabase: SupabaseClient | null = null;
  private bucket = process.env.SUPABASE_BUCKET || 'produtos';

  constructor() {
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      });
    }
  }

  async salvar(file: Express.Multer.File): Promise<string> {
    const ext = (extname(file.originalname) || '.jpg').toLowerCase();
    const nome = `${randomUUID()}${ext}`;
    if (this.supabase) {
      const { error } = await this.supabase.storage
        .from(this.bucket)
        .upload(nome, file.buffer, { contentType: file.mimetype, upsert: false });
      if (error) throw new BadRequestException('Falha ao enviar imagem: ' + error.message);
      return this.supabase.storage.from(this.bucket).getPublicUrl(nome).data.publicUrl;
    }
    // Sem Supabase configurado: salva na pasta ./uploads da API
    const dir = join(process.cwd(), 'uploads');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(join(dir, nome), file.buffer);
    const base = process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 3334}`;
    return `${base}/uploads/${nome}`;
  }
}

// ------------------------------------------------------------------ Service
@Injectable()
export class ProdutosService {
  constructor(
    @InjectDataSource() private ds: DataSource,
    private movs: MovimentacoesService,
    private storage: ImagemStorage,
  ) {}

  private repo() {
    return this.ds.getRepository(Produto);
  }

  listar(f: FiltroProdutoDto) {
    const q = this.repo().createQueryBuilder('p').orderBy('p.nome', 'ASC');
    q.where('p.ativo = :ativo', { ativo: !f.inativos });
    if (f.categoria) q.andWhere('p.categoria = :cat', { cat: f.categoria });
    if (f.busca) {
      q.andWhere(
        '(p.nome ILIKE :b OR p.marca ILIKE :b OR p.descricao ILIKE :b OR p.codigo_barras = :exato)',
        { b: `%${f.busca}%`, exato: f.busca },
      );
    }
    if (f.comSaldoEm === Local.ESTOQUE) q.andWhere('p.saldo_estoque > 0');
    if (f.comSaldoEm === Local.CLINICA) q.andWhere('p.saldo_clinica > 0');
    if (f.abaixoMinimo) q.andWhere('(p.saldo_estoque + p.saldo_clinica) <= p.estoque_minimo');
    return q.getMany();
  }

  async buscar(id: string) {
    const p = await this.repo().findOne({ where: { id } });
    if (!p) throw new NotFoundException('Produto não encontrado');
    return p;
  }

  async criar(dto: CriarProdutoDto, u: UsuarioLogado) {
    await this.validarCodigo(dto.codigoBarras);
    return this.ds.transaction(async (m) => {
      const { quantidadeInicial, localInicial, motivoEntrada, ...dados } = dto;
      const p = await m.getRepository(Produto).save(
        m.getRepository(Produto).create({
          ...dados,
          custoUnitario: r2(dto.custoUnitario),
          saldoEstoque: 0,
          saldoClinica: 0,
        }),
      );
      if (quantidadeInicial && quantidadeInicial > 0) {
        const travado = await this.movs.travarProduto(m, p.id);
        await this.movs.registrar(m, {
          produto: travado,
          tipo: TipoMovimentacao.ENTRADA,
          origem: null,
          destino: localInicial ?? Local.ESTOQUE,
          quantidade: quantidadeInicial,
          motivo: motivoEntrada?.trim() || 'Cadastro do produto (entrada inicial)',
          responsavelId: u.id,
        });
      }
      return m.getRepository(Produto).findOneOrFail({ where: { id: p.id } });
    });
  }

  async atualizar(id: string, dto: AtualizarProdutoDto) {
    const p = await this.buscar(id);
    if (dto.codigoBarras && dto.codigoBarras !== p.codigoBarras) await this.validarCodigo(dto.codigoBarras);
    Object.assign(p, dto);
    if (dto.custoUnitario !== undefined) p.custoUnitario = r2(dto.custoUnitario);
    const { saldoEstoque, saldoClinica, createdAt, updatedAt, ...dados } = p;
    await this.repo().update(id, dados);
    return this.buscar(id);
  }

  async desativar(id: string) {
    await this.buscar(id);
    await this.repo().update(id, { ativo: false });
    return { ok: true };
  }

  async salvarImagem(id: string, file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Envie a imagem no campo "imagem"');
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      throw new BadRequestException('Formato de imagem inválido (use JPG, PNG ou WEBP)');
    }
    await this.buscar(id);
    const url = await this.storage.salvar(file);
    await this.repo().update(id, { imagemUrl: url });
    return this.buscar(id);
  }

  private async validarCodigo(codigo?: string | null) {
    if (!codigo) return;
    if (await this.repo().findOne({ where: { codigoBarras: codigo } })) {
      throw new ConflictException('Já existe um produto com este código de barras');
    }
  }
}

// ------------------------------------------------------------------ Controller
@Controller('produtos')
export class ProdutosController {
  constructor(private service: ProdutosService) {}

  @Get()
  listar(@Query() f: FiltroProdutoDto) {
    return this.service.listar(f);
  }

  @Get(':id')
  buscar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.buscar(id);
  }

  @Post()
  criar(@Body() dto: CriarProdutoDto, @UsuarioAtual() u: UsuarioLogado) {
    return this.service.criar(dto, u);
  }

  @Roles(Papel.ADMIN)
  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarProdutoDto) {
    return this.service.atualizar(id, dto);
  }

  @Post(':id/imagem')
  @UseInterceptors(FileInterceptor('imagem', { limits: { fileSize: 5 * 1024 * 1024 } }))
  imagem(@Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    return this.service.salvarImagem(id, file);
  }

  @Roles(Papel.ADMIN)
  @Delete(':id')
  desativar(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.desativar(id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Produto]), MovimentacoesModule],
  providers: [ProdutosService, ImagemStorage],
  controllers: [ProdutosController],
})
export class ProdutosModule {}
