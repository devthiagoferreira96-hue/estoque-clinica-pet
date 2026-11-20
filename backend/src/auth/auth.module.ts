import { Body, Controller, Get, Injectable, Module, OnModuleInit, Post, UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule, PassportStrategy } from '@nestjs/passport';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Public, UsuarioAtual, UsuarioLogado } from '../common/auth.decorators';
import { Papel } from '../common/enums';
import { Usuario } from '../entities';

class LoginDto {
  @IsEmail({}, { message: 'E-mail inválido' }) email: string;
  @IsString() @MinLength(4) senha: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@InjectRepository(Usuario) private repo: Repository<Usuario>) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'dev-secret',
    });
  }
  async validate(payload: { sub: string }): Promise<UsuarioLogado> {
    const u = await this.repo.findOne({ where: { id: payload.sub } });
    if (!u || !u.ativo) throw new UnauthorizedException('Usuário inativo');
    return { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
  }
}

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    @InjectRepository(Usuario) private repo: Repository<Usuario>,
    private jwt: JwtService,
  ) {}

  /** Cria o primeiro administrador automaticamente */
  async onModuleInit() {
    if ((await this.repo.count()) > 0) return;
    const email = (process.env.ADMIN_EMAIL || 'admin@exemplo.com').toLowerCase();
    await this.repo.save(
      this.repo.create({
        nome: process.env.ADMIN_NOME || 'Administrador',
        email,
        senhaHash: await bcrypt.hash(process.env.ADMIN_SENHA || 'trocar123', 10),
        papel: Papel.ADMIN,
      }),
    );
    console.log(`👤 Administrador criado: ${email} (troque a senha no primeiro acesso)`);
  }

  async login(email: string, senha: string) {
    const u = await this.repo
      .createQueryBuilder('u')
      .addSelect('u.senhaHash')
      .where('lower(u.email) = :email', { email: email.toLowerCase() })
      .getOne();
    if (!u || !u.ativo || !(await bcrypt.compare(senha, u.senhaHash))) {
      throw new UnauthorizedException('E-mail ou senha incorretos');
    }
    const token = await this.jwt.signAsync({ sub: u.id, papel: u.papel });
    return { token, usuario: { id: u.id, nome: u.nome, email: u.email, papel: u.papel } };
  }
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.senha);
  }

  @Get('me')
  me(@UsuarioAtual() u: UsuarioLogado) {
    return u;
  }
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET || 'dev-secret',
        signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '12h' },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
