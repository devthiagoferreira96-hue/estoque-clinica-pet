import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './common/auth.decorators';
import { ENTIDADES } from './entities';
import { MovimentacoesModule } from './movimentacoes/movimentacoes.module';
import { ProdutosModule } from './produtos/produtos.module';
import { RelatoriosModule } from './relatorios/relatorios.module';
import { UsuariosModule } from './usuarios/usuarios.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
        entities: ENTIDADES,
        // As tabelas são criadas pelo arquivo supabase/schema.sql
        synchronize: false,
        logging: ['error'],
      }),
    }),
    AuthModule,
    UsuariosModule,
    ProdutosModule,
    MovimentacoesModule,
    RelatoriosModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
