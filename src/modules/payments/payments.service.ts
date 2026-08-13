import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import axios from 'axios';
import * as paypalCheckoutServerSdk from '@paypal/checkout-server-sdk';
import MercadoPagoConfig from 'mercadopago';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Pay } from './entities/pay.entity';
import {
  CreateOrderDto,
  CreateMercadoPagoOrderDto,
  CreateMpPreferenceDto,
  CreatePayPalOrderDto,
  CapturePayPalOrderDto,
} from './dtos/create-payment.dto';
import { PaymentsRepository } from './repositories/payments.repository';
import { MercadoPagoRepository } from './repositories/mercadopago.repository';
import { PaymentStatus } from './enums/payment-status.enum';
import { UsersService } from '../users/users.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  // Mapeo de países a monedas para MercadoPago
  private readonly countryToCurrency: { [key: string]: string } = {
    argentina: 'ARS',
    brasil: 'BRL',
    br: 'BRL',
    ar: 'ARS',
    mx: 'MXN',
    mexico: 'MXN',
    co: 'COP',
    colombia: 'COP',
    cl: 'CLP',
    chile: 'CLP',
    pe: 'PEN',
    peru: 'PEN',
    uy: 'UYU',
    uruguay: 'UYU',
    us: 'USD',
    usa: 'USD',
    eu: 'EUR',
    es: 'EUR',
    france: 'EUR',
  };

  constructor(
    private paymentsRepository: PaymentsRepository,
    private mercadoPagoRepository: MercadoPagoRepository,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Pay)
    private payRepository: Repository<Pay>,
    @InjectDataSource()
    private dataSource: DataSource,
    private usersService: UsersService,
  ) {}

  /**
   * Determina la moneda según el país del usuario
   * Por defecto retorna COP (Pesos Colombianos)
   */
  private getCurrencyByCountry(country?: string): string {
    if (!country) return 'COP';
    const normalizedCountry = country.toLowerCase().trim();
    return this.countryToCurrency[normalizedCountry] || 'COP';
  }

  /**
   * Crea una orden de MercadoPago de forma unificada
   * Maneja automáticamente la moneda según el país del usuario
   */
  async createMercadoPagoOrderUnified(createOrderDto: CreateOrderDto): Promise<any> {
    try {
      const user = await this.usersRepository.findOne({
        where: { id: createOrderDto.userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Determinar la moneda según el país del usuario
      const currency = createOrderDto.currency || this.getCurrencyByCountry(user.country);

      const mercadoPagoDto: CreateMercadoPagoOrderDto = {
        userId: createOrderDto.userId,
        chips: createOrderDto.chips,
        price: createOrderDto.price,
        currency,
      };
      
      return await this.createMercadoPagoOrder(mercadoPagoDto);
    } catch (error) {
      this.logger.error('Order Creation Error:', error);
      throw error;
    }
  }

  // ============= MERCADOPAGO =============

  /**
   * Ruta: POST /mepago/create-order
   * Recibe CreateMercadoPagoOrderDto (userId, chips, price, currency).
   * Delega la llamada a la API de MP en MercadoPagoRepository y graba el
   * registro pendiente en BD. Retorna { orderId, initPoint }.
   */
  async createMercadoPagoOrder(
    createMercadoPagoOrderDto: CreateMercadoPagoOrderDto,
  ): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: createMercadoPagoOrderDto.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const isProduction = process.env.NODE_ENV === 'production';

    const preference = await this.mercadoPagoRepository.createPreference({
      itemId: `${createMercadoPagoOrderDto.userId}-${Date.now()}`,
      title: `Royal Games - ${createMercadoPagoOrderDto.chips} Chips`,
      unitPrice: parseFloat(createMercadoPagoOrderDto.price),
      quantity: 1,
      currencyId: createMercadoPagoOrderDto.currency,
      userId: createMercadoPagoOrderDto.userId,
      chips: createMercadoPagoOrderDto.chips,
    });

    // Crear registro de pago PENDIENTE con preferenceId
    const pagoDb = this.payRepository.create({
      userId: createMercadoPagoOrderDto.userId,
      chips: createMercadoPagoOrderDto.chips,
      price: createMercadoPagoOrderDto.price,
      paymentPlatform: 'mepago',
      mercadoPagoPreferenceId: preference.preferenceId,
      status: PaymentStatus.PENDING,
      date: new Date().toISOString(),
    });
    await this.paymentsRepository.create(pagoDb);

    return {
      orderId: preference.preferenceId,
      initPoint: isProduction
        ? preference.initPoint
        : preference.sandboxInitPoint,
    };
  }

  /**
   * Ruta: POST /mercadopago/create_preference
   * Estilo El_Gaalpon_de_Jose: recibe el body tal como lo envía el frontend
   * de referencia (title, quantity, unit_price, currency_id, userId, chips?).
   * Retorna { preferenceId, initPoint, redirectUrl } para máxima compatibilidad.
   */
  async createMpPreference(dto: CreateMpPreferenceDto): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const isProduction = process.env.NODE_ENV === 'production';
    const chips = dto.chips ?? 0;

    const preference = await this.mercadoPagoRepository.createPreference({
      itemId: `${dto.userId}-${Date.now()}`,
      title: dto.title,
      unitPrice: dto.unit_price,
      quantity: dto.quantity,
      currencyId: dto.currency_id,
      userId: dto.userId,
      chips,
    });

    // Registrar pago pendiente en BD
    const pagoDb = this.payRepository.create({
      userId: dto.userId,
      chips,
      price: String(dto.unit_price * dto.quantity),
      paymentPlatform: 'mepago',
      mercadoPagoPreferenceId: preference.preferenceId,
      status: PaymentStatus.PENDING,
      date: new Date().toISOString(),
    });
    await this.paymentsRepository.create(pagoDb);

    const initPoint = isProduction
      ? preference.initPoint
      : preference.sandboxInitPoint;

    return {
      preferenceId: preference.preferenceId,
      initPoint,
      // redirectUrl para compatibilidad con PlansView.tsx de referencia
      redirectUrl: initPoint,
    };
  }

  /**
   * Ruta: POST /mercadopago/payment (webhook alternativo estilo El_Gaalpon)
   * MercadoPago llama a esta ruta con ?id=&userId=&pagoId= al completarse un pago.
   * Delega el procesamiento al webhook principal existente.
   */
  async handleMercadoPagoPaymentWebhook(
    id: string,
    userId: string,
    pagoId: string,
  ): Promise<any> {
    this.logger.debug(
      `MP payment webhook (alt): id=${id} userId=${userId} pagoId=${pagoId}`,
    );
    // Reutilizar la lógica del webhook principal pasando el id como data.data.id
    if (id) {
      await this.handleMercadoPagoWebhook(
        { type: 'payment', data: { id } },
        {},
      );
    }
    return { status: 'received' };
  }

  async handleMercadoPagoWebhook(data: any, queryParams?: any): Promise<void> {
    try {
      // Manejo de merchant_order (webhook con query params: ?id=&topic=merchant_order)
      if (queryParams?.topic === 'merchant_order' && queryParams?.merchantOrderId) {
        this.logger.debug(`Merchant Order webhook received: ${queryParams.merchantOrderId}`);
        await this.processMercadoPagoMerchantOrder(queryParams.merchantOrderId);
        return;
      }

      // Manejo de payment webhook (JSON body)
      if (!data || !data.type || data.type !== 'payment') {
        this.logger.warn(`Invalid webhook data format. Expected type=payment, got: ${data?.type}`);
        return;
      }

      if (!data.data || !data.data.id) {
        this.logger.warn('Missing payment ID in webhook');
        return;
      }

      // Usar transacción para garantizar consistencia
      return await this.dataSource.manager.transaction(async (manager) => {
        const mpClient = new MercadoPagoConfig({
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        });

        try {
          const paymentData = await mpClient.payment.findById(data.data.id);
          const payment = paymentData.body;

          if (!payment) {
            this.logger.error('Payment not found in MercadoPago');
            return;
          }

          const userId = payment.external_reference;
          const chips = payment.metadata?.chips || 0;
          const preferenceId = payment.order?.id || payment.preference_id;

          if (!userId || !chips) {
            this.logger.warn('Missing userId or chips in payment metadata');
            return;
          }

          const user = await manager.findOne(User, { where: { id: userId } });
          if (!user) {
            this.logger.error(`User not found: ${userId}`);
            return;
          }

          // Buscar pago existente por mercadoPagoPaymentId (para evitar duplicados)
          const existingPaymentByPaymentId = await manager.findOne(Pay, {
            where: { mercadoPagoPaymentId: payment.id },
          });

          if (existingPaymentByPaymentId) {
            // Pago ya fue procesado
            this.logger.debug(`Payment ${payment.id} already processed`);
            return;
          }

          // Buscar pago PENDIENTE por userId + preferenceId para actualizar
          const pendingPayment = await manager.findOne(Pay, {
            where: {
              userId,
              status: PaymentStatus.PENDING,
            },
            order: { createdAt: 'DESC' }, // Obtener el más reciente
          });

          if (payment.status === 'approved') {
            // Actualizar usuario con chips
            user.chips = (user.chips || 0) + chips;
            await manager.save(User, user);
            await this.usersService.registerDeposit(userId, chips, manager);

            if (pendingPayment) {
              // Actualizar orden pendiente existente
              pendingPayment.status = PaymentStatus.APPROVED;
              pendingPayment.mercadoPagoPaymentId = payment.id;
              pendingPayment.date = new Date().toISOString();
              await manager.save(Pay, pendingPayment);

              this.logger.log(`Payment approved for user ${userId}: +${chips} chips`);
            } else {
              // Si no hay pendiente, crear uno nuevo (por si llega webhook de payment sin crear orden primero)
              const newPayment = manager.create(Pay, {
                userId,
                chips,
                price: payment.transaction_amount?.toString() || '0',
                paymentPlatform: 'mepago',
                mercadoPagoPaymentId: payment.id,
                mercadoPagoPreferenceId: preferenceId || payment.id,
                status: PaymentStatus.APPROVED,
                date: new Date().toISOString(),
              });
              await manager.save(Pay, newPayment);

              this.logger.log(
                `Payment approved for user ${userId}: +${chips} chips (created new record)`,
              );
            }
          } else if (payment.status === 'rejected') {
            // Actualizar estado a rechazado
            if (pendingPayment) {
              pendingPayment.status = PaymentStatus.REJECTED;
              pendingPayment.mercadoPagoPaymentId = payment.id;
              await manager.save(Pay, pendingPayment);
            }
            this.logger.warn(`Payment rejected for user ${userId}`);
          } else if (payment.status === 'cancelled') {
            // Actualizar estado a cancelado
            if (pendingPayment) {
              pendingPayment.status = PaymentStatus.CANCELLED;
              pendingPayment.mercadoPagoPaymentId = payment.id;
              await manager.save(Pay, pendingPayment);
            }
            this.logger.warn(`Payment cancelled for user ${userId}`);
          }
        } catch (mpError) {
          this.logger.error('Error querying MercadoPago API:', mpError);
          throw mpError;
        }
      });
    } catch (error) {
      this.logger.error('MercadoPago Webhook Error:', error);
      throw error;
    }
  }

  /**
   * Procesa merchant_order webhooks de MercadoPago
   * Este tipo de webhook se envía cuando cambia el estado de una orden
   */
  private async processMercadoPagoMerchantOrder(merchantOrderId: string): Promise<void> {
    try {
      // Obtener merchant order directamente de la API de MercadoPago
      const merchantOrderUrl = `https://api.mercadopago.com/merchant_orders/${merchantOrderId}`;
      const response = await axios.get(merchantOrderUrl, {
        headers: {
          Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
        },
      });

      const merchantOrder = response.data;

      if (!merchantOrder || !merchantOrder.payments || merchantOrder.payments.length === 0) {
        this.logger.debug(
          `Merchant order ${merchantOrderId} has no payments yet (user may have cancelled)`,
        );
        return;
      }

      // Procesar el pago más reciente/exitoso
      const approvedPayment = merchantOrder.payments.find(
        (p: any) => p.status === 'approved' || p.status === 'authorized',
      );

      if (!approvedPayment) {
        this.logger.warn(`No approved payment found in merchant order ${merchantOrderId}`);
        return;
      }

      // Obtener detalles del pago
      const mpClient = new MercadoPagoConfig({
        accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
      });

      const paymentData = await mpClient.payment.findById(approvedPayment.id);
      const payment = paymentData.body;

      if (!payment) {
        this.logger.error('Payment not found in MercadoPago');
        return;
      }

      const userId = payment.external_reference;
      const chips = payment.metadata?.chips || 0;

      if (!userId || !chips) {
        this.logger.warn('Missing userId or chips in payment metadata');
        return;
      }

      await this.dataSource.manager.transaction(async (manager) => {
        const user = await manager.findOne(User, { where: { id: userId } });
        if (!user) {
          this.logger.error(`User not found: ${userId}`);
          return;
        }

        // Buscar pago existente por mercadoPagoPaymentId
        const existingPayment = await manager.findOne(Pay, {
          where: { mercadoPagoPaymentId: payment.id },
        });

        if (!existingPayment) {
          // Crear pago nuevo
          const newPayment = manager.create(Pay, {
            userId,
            chips,
            price: payment.transaction_amount?.toString() || '0',
            paymentPlatform: 'mepago',
            mercadoPagoPaymentId: payment.id,
            mercadoPagoPreferenceId: merchantOrderId,
            status: PaymentStatus.APPROVED,
            date: new Date().toISOString(),
          });

          await manager.save(Pay, newPayment);

          // Actualizar chips del usuario
          user.chips = (user.chips || 0) + chips;
          await manager.save(User, user);
          await this.usersService.registerDeposit(userId, chips, manager);

          this.logger.log(
            `Merchant Order processed - Payment approved for user ${userId}: +${chips} chips`,
          );
        } else {
          this.logger.debug(`Payment ${payment.id} already processed, skipping`);
        }
      });
    } catch (error) {
      this.logger.error('Error processing MercadoPago merchant order:', error);
      // No lanzar error para evitar reintentos infinitos del webhook
    }
  }

  // ============= MERCADOPAGO MEXICO =============
  async createMercadoPagoOrderMx(
    createMercadoPagoOrderDto: CreateMercadoPagoOrderDto,
  ): Promise<any> {
    // Removed: consolidated into createMercadoPagoOrder
    throw new BadRequestException('MX-specific endpoint removed. Use /mepago/create-order with currency="MXN"');
  }

  async handleMercadoPagoWebhookMx(data: any): Promise<void> {
    // Removed: webhook handling consolidated to handleMercadoPagoWebhook
    this.logger.warn('handleMercadoPagoWebhookMx called but endpoint is removed.');
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
        // Usar transacción para actualizar usuario y crear pago
        return await this.dataSource.manager.transaction(async (manager) => {
          const transactionUser = await manager.findOne(User, {
            where: { id: capturePayPalOrderDto.userId },
          });

          if (transactionUser) {
            transactionUser.chips = (transactionUser.chips || 0) + capturePayPalOrderDto.chips;
            await manager.save(User, transactionUser);
            await this.usersService.registerDeposit(
              capturePayPalOrderDto.userId,
              capturePayPalOrderDto.chips,
              manager,
            );
          }

          const paymentId = response.result.id;
          await manager.save(
            Pay,
            manager.create(Pay, {
              userId: capturePayPalOrderDto.userId,
              chips: capturePayPalOrderDto.chips,
              price: capturePayPalOrderDto.price,
              paymentPlatform: 'paypal',
              mercadoPagoPaymentId: paymentId,
              status: PaymentStatus.APPROVED,
              date: new Date().toISOString(),
            }),
          );

          this.logger.log(`PayPal payment captured for user ${capturePayPalOrderDto.userId}: +${capturePayPalOrderDto.chips} chips`);
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
