import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import * as paypalCheckoutServerSdk from '@paypal/checkout-server-sdk';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { Repository, DataSource } from 'typeorm';
import { InjectRepository, InjectDataSource } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Pay } from './entities/pay.entity';
import {
  CreateMercadoPagoOrderDto,
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

    // MercadoPago ya no separa "sandbox" de "producción" por URL: lo que determina
    // si una transacción es real o de prueba es el MERCADOPAGO_ACCESS_TOKEN usado
    // para crear la preferencia (cuenta de prueba vs. cuenta real). `sandbox_init_point`
    // apunta a un dominio legacy que MercadoPago ya no mantiene en paridad con la API
    // normal (ver merchant_orders 403), así que siempre usamos `init_point`.
    return {
      orderId: preference.preferenceId,
      initPoint: preference.initPoint,
    };
  }

  async handleMercadoPagoWebhook(data: any, queryParams?: any): Promise<void> {
    try {
      // Manejo de payment webhook estilo IPN legacy (query params: ?id=&topic=payment).
      // MercadoPago sigue mandando este formato en paralelo al de webhooks v2 (JSON body).
      if (queryParams?.topic === 'payment' && queryParams?.id) {
        this.logger.debug(`Payment IPN webhook received: ${queryParams.id}`);
        await this.processMercadoPagoPayment(queryParams.id);
        return;
      }

      // Manejo de payment webhook (JSON body, formato webhooks v2)
      if (!data || !data.type || data.type !== 'payment') {
        this.logger.warn(`Invalid webhook data format. Expected type=payment, got: ${data?.type}`);
        return;
      }

      if (!data.data || !data.data.id) {
        this.logger.warn('Missing payment ID in webhook');
        return;
      }

      await this.processMercadoPagoPayment(data.data.id);
    } catch (error) {
      this.logger.error('MercadoPago Webhook Error:', error);
      throw error;
    }
  }

  /**
   * Procesa un pago de MercadoPago por su ID (sea que haya llegado vía IPN
   * legacy `topic=payment` o vía webhooks v2 `type=payment` en el body).
   */
  private async processMercadoPagoPayment(paymentId: string): Promise<void> {
    try {
      // Usar transacción para garantizar consistencia
      return await this.dataSource.manager.transaction(async (manager) => {
        const mpClient = new MercadoPagoConfig({
          accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
        });

        try {
          const payment = await new Payment(mpClient).get({ id: paymentId });

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
            // Actualizar usuario con chips. `chips` es una columna bigint: TypeORM la
            // devuelve como string, así que hay que castear antes de sumar (si no,
            // `(user.chips || 0) + chips` concatena strings en vez de sumar).
            user.chips = Number(user.chips || 0) + chips;
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
            transactionUser.chips = Number(transactionUser.chips || 0) + capturePayPalOrderDto.chips;
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
