import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as paypalCheckoutServerSdk from '@paypal/checkout-server-sdk';
import MercadoPagoConfig, { Preference } from 'mercadopago';
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

      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      });
      const preferenceClient = new Preference(client);

      const mepagoSuccessUrl = process.env.MERCADOPAGO_SUCCESS_URL;
      const mepagoFailureUrl = process.env.MERCADOPAGO_FAILURE_URL;
      const mepagoPendingUrl = process.env.MERCADOPAGO_PENDING_URL;
      const shouldUseAutoReturn =
        process.env.NODE_ENV === 'production' &&
        mepagoSuccessUrl &&
        !mepagoSuccessUrl.includes('localhost') &&
        !mepagoSuccessUrl.includes('127.0.0.1');

      const currencyId = (createMercadoPagoOrderDto.currency || 'COP').toUpperCase();
      const supportedCurrencies = ['COP', 'MXN', 'USD', 'ARS', 'BRL', 'EUR'];
      if (!supportedCurrencies.includes(currencyId)) {
        throw new BadRequestException(`Unsupported MercadoPago currency: ${currencyId}`);
      }

      const response = await preferenceClient.create({
        body: {
          items: [
            {
              id: 'chips',
              title: `Royal Games - ${createMercadoPagoOrderDto.chips} Chips`,
              unit_price: parseFloat(createMercadoPagoOrderDto.price),
              quantity: 1,
              currency_id: currencyId,
            },
          ],
          payer: {
            email: user.email,
          },
          payment_methods: {
            excluded_payment_types: [
              { id: 'digital_currency' },
              { id: 'digital_wallet' },
            ],
            installments: 1,
          },
          back_urls: {
            success: mepagoSuccessUrl,
            failure: mepagoFailureUrl,
            pending: mepagoPendingUrl,
          },
          ...(shouldUseAutoReturn ? { auto_return: 'approved' } : {}),
          external_reference: createMercadoPagoOrderDto.userId,
          metadata: {
            chips: createMercadoPagoOrderDto.chips,
          },
        },
      });

      return {
        orderId: response.id,
        initPoint: process.env.NODE_ENV === 'production'
          ? response.init_point
          : response.sandbox_init_point,
      };
    } catch (error: any) {
      const errorMessage =
        error?.response?.body?.message || error?.message || 'Unknown MercadoPago error';
      this.logger.error('MercadoPago Order Creation Error:', errorMessage, error);
      throw new BadRequestException('Failed to create MercadoPago order');
    }
  }

  async handleMercadoPagoWebhook(data: any): Promise<void> {
    try {
      if (data.type === 'payment') {
        const mpClient = new MercadoPagoConfig({
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        });

        const paymentData = await mpClient.payment.findById(data.data.id);
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

      const client = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN_MX,
      });
      const preferenceClient = new Preference(client);

      const mepagoSuccessUrlMx = process.env.MERCADOPAGO_SUCCESS_URL_MX;
      const mepagoFailureUrlMx = process.env.MERCADOPAGO_FAILURE_URL_MX;
      const mepagoPendingUrlMx = process.env.MERCADOPAGO_PENDING_URL_MX;
      const shouldUseAutoReturnMx =
        process.env.NODE_ENV === 'production' &&
        mepagoSuccessUrlMx &&
        !mepagoSuccessUrlMx.includes('localhost') &&
        !mepagoSuccessUrlMx.includes('127.0.0.1');

      const response = await preferenceClient.create({
        body: {
          items: [
            {
              id: 'chips',
              title: `Royal Games - ${createMercadoPagoOrderDto.chips} Chips`,
              unit_price: parseFloat(createMercadoPagoOrderDto.price),
              quantity: 1,
              currency_id: 'MXN',
            },
          ],
          payer: {
            email: user.email,
          },
          payment_methods: {
            excluded_payment_types: [
              { id: 'digital_currency' },
              { id: 'digital_wallet' },
            ],
            installments: 1,
          },
          back_urls: {
            success: mepagoSuccessUrlMx,
            failure: mepagoFailureUrlMx,
            pending: mepagoPendingUrlMx,
          },
          ...(shouldUseAutoReturnMx ? { auto_return: 'approved' } : {}),
          external_reference: createMercadoPagoOrderDto.userId,
          metadata: {
            chips: createMercadoPagoOrderDto.chips,
          },
        },
      });

      return {
        orderId: response.id,
        initPoint: process.env.NODE_ENV === 'production'
          ? response.init_point
          : response.sandbox_init_point,
      };
    } catch (error: any) {
      const errorMessage =
        error?.response?.body?.message || error?.message || 'Unknown MercadoPago MX error';
      this.logger.error('MercadoPago MX Order Creation Error:', errorMessage, error);
      throw new BadRequestException('Failed to create MercadoPago MX order');
    }
  }

  async handleMercadoPagoWebhookMx(data: any): Promise<void> {
    try {
      if (data.type === 'payment') {
        const mpClient = new MercadoPagoConfig({
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN_MX,
        });

        const paymentData = await mpClient.payment.findById(data.data.id);
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
