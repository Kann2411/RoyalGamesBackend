import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateMercadoPagoOrderDto, CreatePayPalOrderDto, CapturePayPalOrderDto } from './dtos/create-payment.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // ============= MERCADOPAGO =============
  @Post('mepago/create-order')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create MercadoPago order (USD)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createMercadoPagoOrder(
    @Body() createMercadoPagoOrderDto: CreateMercadoPagoOrderDto,
  ) {
    return this.paymentsService.createMercadoPagoOrder(createMercadoPagoOrderDto);
  }

  @Post('mepago/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MercadoPago webhook' })
  async handleMercadoPagoWebhook(@Body() data: any) {
    await this.paymentsService.handleMercadoPagoWebhook(data);
    return { status: 'received' };
  }

  // ============= MERCADOPAGO MEXICO =============
  @Post('mepago/create-order/mx')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create MercadoPago order (MXN)' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createMercadoPagoOrderMx(
    @Body() createMercadoPagoOrderDto: CreateMercadoPagoOrderDto,
  ) {
    return this.paymentsService.createMercadoPagoOrderMx(createMercadoPagoOrderDto);
  }

  @Post('mepago/webhook/mx')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MercadoPago MX webhook' })
  async handleMercadoPagoWebhookMx(@Body() data: any) {
    await this.paymentsService.handleMercadoPagoWebhookMx(data);
    return { status: 'received' };
  }

  // ============= PAYPAL =============
  @Post('paypal/create-order')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create PayPal order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createPayPalOrder(@Body() createPayPalOrderDto: CreatePayPalOrderDto) {
    return this.paymentsService.createPayPalOrder(createPayPalOrderDto);
  }

  @Post('paypal/capture-order')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Capture PayPal order' })
  @ApiResponse({ status: 200, description: 'Order captured successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async capturePayPalOrder(@Body() capturePayPalOrderDto: CapturePayPalOrderDto) {
    return this.paymentsService.capturePayPalOrder(capturePayPalOrderDto);
  }

  // ============= GENERAL =============
  @Get()
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get user payments' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User payments retrieved successfully' })
  async getUserPayments(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.paymentsService.getUserPayments(userId);
  }
}
