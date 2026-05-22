import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Pay } from '../entities/pay.entity';

@Injectable()
export class PaymentsRepository {
  constructor(
    @InjectRepository(Pay)
    private repository: Repository<Pay>,
  ) {}

  async findById(paymentId: number): Promise<Pay | null> {
    return this.repository.findOne({ where: { paymentId } });
  }

  async findByUserId(userId: string): Promise<Pay[]> {
    return this.repository.find({ where: { userId } });
  }

  async create(paymentData: Partial<Pay>): Promise<Pay> {
    const payment = this.repository.create(paymentData);
    return this.repository.save(payment);
  }

  async update(paymentId: number, updateData: Partial<Pay>): Promise<Pay | null> {
    await this.repository.update(paymentId, updateData);
    return this.findById(paymentId);
  }

  async findAll(): Promise<Pay[]> {
    return this.repository.find();
  }
}
