import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Categoria, Local, Papel, TipoMovimentacao } from '../common/enums';
import { numeric } from '../common/money';

// ---------------------------------------------------------------- Usuário
@Entity('usuarios')
export class Usuario {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 120 }) nome: string;
  @Column({ length: 160, unique: true }) email: string;
  @Column({ name: 'senha_hash', length: 200, select: false }) senhaHash: string;
  @Column({ type: 'enum', enum: Papel, enumName: 'papel_usuario', default: Papel.FUNCIONARIO })
  papel: Papel;
  @Column({ default: true }) ativo: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

// ---------------------------------------------------------------- Produto
@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ length: 160 }) nome: string;
  @Column({ type: 'varchar', length: 120, nullable: true }) marca: string | null;
  @Column({ type: 'text', nullable: true }) descricao: string | null;
  @Column({ type: 'enum', enum: Categoria, enumName: 'categoria_produto' }) categoria: Categoria;
  @Column({ length: 10, default: 'UN' }) unidade: string;
  @Column({ name: 'codigo_barras', type: 'varchar', length: 60, nullable: true, unique: true })
  codigoBarras: string | null;
  @Column({ name: 'imagem_url', type: 'text', nullable: true }) imagemUrl: string | null;

  /** Valor unitário PAGO (custo) */
  @Column({ name: 'custo_unitario', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numeric })
  custoUnitario: number;

  // ---- 2 saldos independentes ----
  @Column({ name: 'saldo_estoque', type: 'numeric', precision: 12, scale: 3, default: 0, transformer: numeric })
  saldoEstoque: number;
  @Column({ name: 'saldo_clinica', type: 'numeric', precision: 12, scale: 3, default: 0, transformer: numeric })
  saldoClinica: number;

  @Column({ name: 'estoque_minimo', type: 'numeric', precision: 12, scale: 3, default: 0, transformer: numeric })
  estoqueMinimo: number;
  @Column({ default: true }) ativo: boolean;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt: Date;
}

// ---------------------------------------------------------------- Log de auditoria
@Entity('movimentacoes')
@Index(['produtoId', 'createdAt'])
export class Movimentacao {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'produto_id', type: 'uuid' }) produtoId: string;
  @ManyToOne(() => Produto) @JoinColumn({ name: 'produto_id' }) produto: Produto;
  @Column({ type: 'enum', enum: TipoMovimentacao, enumName: 'tipo_movimentacao' }) tipo: TipoMovimentacao;
  @Column({ name: 'local_origem', type: 'enum', enum: Local, enumName: 'local_estoque', nullable: true })
  localOrigem: Local | null;
  @Column({ name: 'local_destino', type: 'enum', enum: Local, enumName: 'local_estoque', nullable: true })
  localDestino: Local | null;
  @Column({ type: 'numeric', precision: 12, scale: 3, transformer: numeric }) quantidade: number;
  @Column({ name: 'custo_unitario', type: 'numeric', precision: 12, scale: 2, default: 0, transformer: numeric })
  custoUnitario: number;
  @Column({ type: 'text' }) motivo: string;
  @Column({ name: 'responsavel_id', type: 'uuid' }) responsavelId: string;
  @ManyToOne(() => Usuario) @JoinColumn({ name: 'responsavel_id' }) responsavel: Usuario;
  @Column({ name: 'saldo_estoque_apos', type: 'numeric', precision: 12, scale: 3, transformer: numeric })
  saldoEstoqueApos: number;
  @Column({ name: 'saldo_clinica_apos', type: 'numeric', precision: 12, scale: 3, transformer: numeric })
  saldoClinicaApos: number;
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt: Date;
}

export const ENTIDADES = [Usuario, Produto, Movimentacao];
