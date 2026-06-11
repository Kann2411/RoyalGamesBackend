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

  async findById(id: string): Promise<Pay | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByUserId(userId: string): Promise<Pay[]> {
    return this.repository.find({ where: { userId } });
  }

  async findByMercadoPagoPreferenceId(preferenceId: string): Promise<Pay | null> {
    return this.repository.findOne({ where: { mercadoPagoPreferenceId: preferenceId } });
  }

  async create(paymentData: Partial<Pay>): Promise<Pay> {
    const payment = this.repository.create(paymentData);
    return this.repository.save(payment);
  }

  async update(id: string, updateData: Partial<Pay>): Promise<Pay | null> {
    await this.repository.update(id, updateData);
    return this.findById(id);
  }

  async findAll(): Promise<Pay[]> {
    return this.repository.find();
  }
}
