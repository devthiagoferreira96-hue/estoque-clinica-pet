import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { Repository } from 'typeorm';
import { Roles, UsuarioAtual, UsuarioLogado } from '../common/auth.decorators';
import { Papel } from '../common/enums';
import { Usuario } from '../entities';

class CriarUsuarioDto {
  @IsString() @MinLength(2) nome: string;
  @IsEmail({}, { message: 'E-mail inválido' }) email: string;
  @IsString() @MinLength(6, { message: 'A senha precisa de ao menos 6 caracteres' }) senha: string;
  @IsEnum(Papel) papel: Papel;
}

class AtualizarUsuarioDto {
  @IsOptional() @IsString() @MinLength(2) nome?: string;
  @IsOptional() @IsEnum(Papel) papel?: Papel;
  @IsOptional() @IsBoolean() ativo?: boolean;
  @IsOptional() @IsString() @MinLength(6) senha?: string;
}

class TrocarSenhaDto {
  @IsString() senhaAtual: string;
  @IsString() @MinLength(6, { message: 'A nova senha precisa de ao menos 6 caracteres' }) novaSenha: string;
}

@Injectable()
export class UsuariosService {
  constructor(@InjectRepository(Usuario) private repo: Repository<Usuario>) {}

  listar() {
    return this.repo.find({ order: { nome: 'ASC' } });
  }

  async criar(dto: CriarUsuarioDto) {
    const email = dto.email.toLowerCase();
    if (await this.repo.findOne({ where: { email } })) throw new ConflictException('E-mail já cadastrado');
    const u = await this.repo.save(
      this.repo.create({ nome: dto.nome, email, papel: dto.papel, senhaHash: await bcrypt.hash(dto.senha, 10) }),
    );
    const { senhaHash, ...resto } = u;
    return resto;
  }

  async atualizar(id: string, dto: AtualizarUsuarioDto, quem: UsuarioLogado) {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException('Usuário não encontrado');
    if (id === quem.id && (dto.ativo === false || (dto.papel && dto.papel !== Papel.ADMIN))) {
      throw new BadRequestException('Você não pode desativar ou rebaixar o seu próprio usuário');
    }
    if (dto.nome !== undefined) u.nome = dto.nome;
    if (dto.papel !== undefined) u.papel = dto.papel;
    if (dto.ativo !== undefined) u.ativo = dto.ativo;
    if (dto.senha) u.senhaHash = await bcrypt.hash(dto.senha, 10);
    await this.repo.save(u);
    return this.repo.findOne({ where: { id } });
  }

  async trocarSenha(id: string, dto: TrocarSenhaDto) {
    const u = await this.repo.createQueryBuilder('u').addSelect('u.senhaHash').where('u.id = :id', { id }).getOne();
    if (!u || !(await bcrypt.compare(dto.senhaAtual, u.senhaHash))) {
      throw new BadRequestException('Senha atual incorreta');
    }
    await this.repo.update(id, { senhaHash: await bcrypt.hash(dto.novaSenha, 10) });
    return { ok: true };
  }
}

@Controller('usuarios')
export class UsuariosController {
  constructor(private service: UsuariosService) {}

  /** Lista simples (todos logados podem ver, para filtros do log) */
  @Get()
  listar() {
    return this.service.listar();
  }

  @Roles(Papel.ADMIN)
  @Post()
  criar(@Body() dto: CriarUsuarioDto) {
    return this.service.criar(dto);
  }

  @Post('minha-senha')
  trocarSenha(@UsuarioAtual() u: UsuarioLogado, @Body() dto: TrocarSenhaDto) {
    return this.service.trocarSenha(u.id, dto);
  }

  @Roles(Papel.ADMIN)
  @Patch(':id')
  atualizar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AtualizarUsuarioDto, @UsuarioAtual() u: UsuarioLogado) {
    return this.service.atualizar(id, dto, u);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([Usuario])],
  providers: [UsuariosService],
  controllers: [UsuariosController],
})
export class UsuariosModule {}
