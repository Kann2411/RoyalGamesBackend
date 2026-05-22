import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as paypalCheckoutServerSdk from '@paypal/checkout-server-sdk';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Pay } from './entities/pay.entity';
import { CreateMercadoPagoOrderDto, CreatePayPalOrderDto, CapturePayPalOrderDto } from './dtos/create-payment.dto';
import { PaymentsRepository } from './repositories/payments.repository';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private paymentsRepository: PaymentsRepository,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Pay)
    private payRepository: Repository<Pay>,
  ) {}

  // ============= MERCADOPAGO =============
  async createMercadoPagoOrder(
    createMercadoPagoOrderDto: CreateMercadoPagoOrderDto,
  ): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: createMercadoPagoOrderDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const mp = require('mercadopago');
      mp.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
      });

      const preference = {
        items: [
          {
            title: `Royal Games - ${createMercadoPagoOrderDto.chips} Chips`,
            unit_price: parseFloat(createMercadoPagoOrderDto.price),
            quantity: 1,
            currency_id: 'USD',
          },
        ],
        payer: {
          email: user.email,
        },
        back_urls: {
          success: process.env.MERCADOPAGO_SUCCESS_URL,
          failure: process.env.MERCADOPAGO_FAILURE_URL,
          pending: process.env.MERCADOPAGO_PENDING_URL,
        },
        external_reference: createMercadoPagoOrderDto.userId,
        metadata: {
          chips: createMercadoPagoOrderDto.chips,
        },
      };

      const response = await mp.preferences.create(preference);

      return {
        orderId: response.body.id,
        initPoint: response.body.init_point,
      };
    } catch (error) {
      this.logger.error('MercadoPago Order Creation Error:', error);
      throw new BadRequestException('Failed to create MercadoPago order');
    }
  }

  async handleMercadoPagoWebhook(data: any): Promise<void> {
    try {
      if (data.type === 'payment') {
        const mp = require('mercadopago');
        mp.configure({
          access_token: process.env.MERCADOPAGO_ACCESS_TOKEN,
        });

        const paymentData = await mp.payment.findById(data.data.id);
        const payment = paymentData.body;

        if (payment.status === 'approved') {
          const userId = payment.external_reference;
          const chips = payment.metadata?.chips || 0;
          const user = await this.usersRepository.findOne({ where: { id: userId } });

          if (user) {
            user.chips = (user.chips || 0) + chips;
            await this.usersRepository.save(user);

            await this.paymentsRepository.create({
              paymentId: payment.id,
              userId,
              chips,
              price: payment.transaction_amount.toString(),
              paymentPlatform: 'mepago',
              date: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('MercadoPago Webhook Error:', error);
    }
  }

  // ============= MERCADOPAGO MEXICO =============
  async createMercadoPagoOrderMx(
    createMercadoPagoOrderDto: CreateMercadoPagoOrderDto,
  ): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: createMercadoPagoOrderDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const mp = require('mercadopago');
      mp.configure({
        access_token: process.env.MERCADOPAGO_ACCESS_TOKEN_MX,
      });

      const preference = {
        items: [
          {
            title: `Royal Games - ${createMercadoPagoOrderDto.chips} Chips`,
            unit_price: parseFloat(createMercadoPagoOrderDto.price),
            quantity: 1,
            currency_id: 'MXN',
          },
        ],
        payer: {
          email: user.email,
        },
        back_urls: {
          success: process.env.MERCADOPAGO_SUCCESS_URL_MX,
          failure: process.env.MERCADOPAGO_FAILURE_URL_MX,
          pending: process.env.MERCADOPAGO_PENDING_URL_MX,
        },
        external_reference: createMercadoPagoOrderDto.userId,
        metadata: {
          chips: createMercadoPagoOrderDto.chips,
        },
      };

      const response = await mp.preferences.create(preference);

      return {
        orderId: response.body.id,
        initPoint: response.body.init_point,
      };
    } catch (error) {
      this.logger.error('MercadoPago MX Order Creation Error:', error);
      throw new BadRequestException('Failed to create MercadoPago MX order');
    }
  }

  async handleMercadoPagoWebhookMx(data: any): Promise<void> {
    try {
      if (data.type === 'payment') {
        const mp = require('mercadopago');
        mp.configure({
          access_token: process.env.MERCADOPAGO_ACCESS_TOKEN_MX,
        });

        const paymentData = await mp.payment.findById(data.data.id);
        const payment = paymentData.body;

        if (payment.status === 'approved') {
          const userId = payment.external_reference;
          const chips = payment.metadata?.chips || 0;
          const user = await this.usersRepository.findOne({ where: { id: userId } });

          if (user) {
            user.chips = (user.chips || 0) + chips;
            await this.usersRepository.save(user);

            await this.paymentsRepository.create({
              paymentId: payment.id,
              userId,
              chips,
              price: payment.transaction_amount.toString(),
              paymentPlatform: 'mepago_mx',
              date: new Date().toISOString(),
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('MercadoPago MX Webhook Error:', error);
    }
  }

  // ============= PAYPAL =============
  async createPayPalOrder(createPayPalOrderDto: CreatePayPalOrderDto): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: createPayPalOrderDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const environment = new paypalCheckoutServerSdk.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET,
      );

      const client = new paypalCheckoutServerSdk.core.PayPalHttpClient(environment);
      const request = new paypalCheckoutServerSdk.orders.OrdersCreateRequest();

      request.prefer('return=representation');
      request.body = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: createPayPalOrderDto.price,
            },
            description: `Royal Games - ${createPayPalOrderDto.chips} Chips`,
            custom_id: createPayPalOrderDto.userId,
          },
        ],
        application_context: {
          return_url: process.env.PAYPAL_SUCCESS_URL,
          cancel_url: process.env.PAYPAL_CANCEL_URL,
        },
      };

      const response = await client.execute(request);
      return {
        orderId: response.result.id,
        status: response.result.status,
      };
    } catch (error) {
      this.logger.error('PayPal Order Creation Error:', error);
      throw new BadRequestException('Failed to create PayPal order');
    }
  }

  async capturePayPalOrder(capturePayPalOrderDto: CapturePayPalOrderDto): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: capturePayPalOrderDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      const environment = new paypalCheckoutServerSdk.core.SandboxEnvironment(
        process.env.PAYPAL_CLIENT_ID,
        process.env.PAYPAL_CLIENT_SECRET,
      );

      const client = new paypalCheckoutServerSdk.core.PayPalHttpClient(environment);
      const request = new paypalCheckoutServerSdk.orders.OrdersCaptureRequest(
        capturePayPalOrderDto.orderId,
      );

      const response = await client.execute(request);

      if (response.result.status === 'COMPLETED') {
        user.chips = (user.chips || 0) + capturePayPalOrderDto.chips;
        await this.usersRepository.save(user);

        const paymentId = Math.floor(Math.random() * 1000000000000);
        await this.paymentsRepository.create({
          paymentId,
          userId: capturePayPalOrderDto.userId,
          chips: capturePayPalOrderDto.chips,
          price: capturePayPalOrderDto.price,
          paymentPlatform: 'paypal',
          date: new Date().toISOString(),
        });
      }

      return response.result;
    } catch (error) {
      this.logger.error('PayPal Capture Error:', error);
      throw new BadRequestException('Failed to capture PayPal order');
    }
  }

  // ============= GENERAL PAYMENT METHODS =============
  async getAllPayments(): Promise<Pay[]> {
    return this.paymentsRepository.findAll();
  }

  async getUserPayments(userId: string): Promise<Pay[]> {
    return this.paymentsRepository.findByUserId(userId);
  }
}
