import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TransactionManager {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(handler: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(handler);
  }
}
