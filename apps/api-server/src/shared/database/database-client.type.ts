import { Prisma } from '@prisma/client';
import { PrismaService } from './prisma.service';

export type DatabaseClient = PrismaService | Prisma.TransactionClient;
