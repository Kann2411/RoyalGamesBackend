import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Res,
  UseGuards,
  Redirect,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateOrderDto, CreateMercadoPagoOrderDto, CreatePayPalOrderDto, CapturePayPalOrderDto } from './dtos/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  // ============= UNIFIED MERCADOPAGO CREATION =============
  @Post('create-order')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Create a MercadoPago order',
    description: 'Creates a MercadoPago order with automatic currency detection based on user country.',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createMercadoPagoOrderUnified(@Body() createOrderDto: CreateOrderDto) {
    return this.paymentsService.createMercadoPagoOrderUnified(createOrderDto);
  }

  // ============= MERCADOPAGO =============
  @Post('mepago/create-order')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create MercadoPago order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createMercadoPagoOrder(
    @Body() createMercadoPagoOrderDto: CreateMercadoPagoOrderDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.paymentsService.createMercadoPagoOrder(createMercadoPagoOrderDto);
    const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (mpToken) {
      res.setHeader('x-mercadopago-access-token', mpToken);
    }
    return result;
  }

  @Post('mepago/webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'MercadoPago webhook' })
  async handleMercadoPagoWebhook(
    @Body() data: any,
    @Query('id') merchantOrderId?: string,
    @Query('topic') topic?: string,
  ) {
    await this.paymentsService.handleMercadoPagoWebhook(data, {
      merchantOrderId,
      topic,
    });
    return { status: 'received' };
  }

  @Get('mepago/success')
  @ApiOperation({ summary: 'MercadoPago success redirect' })
  @Redirect('http://localhost:3000/payment/success', 301)
  async mercadoPagoSuccess(@Query() query: any) {
    // MercadoPago redirects here after approved payment
    return { url: 'http://localhost:3000/payment/success' };
  }

  @Get('mepago/failure')
  @ApiOperation({ summary: 'MercadoPago failure redirect' })
  @Redirect('http://localhost:3000/payment/failure', 301)
  async mercadoPagoFailure(@Query() query: any) {
    // MercadoPago redirects here after failed payment
    return { url: 'http://localhost:3000/payment/failure' };
  }

  @Get('mepago/pending')
  @ApiOperation({ summary: 'MercadoPago pending redirect' })
  @Redirect('http://localhost:3000/payment/pending', 301)
  async mercadoPagoPending(@Query() query: any) {
    // MercadoPago redirects here for pending payments
    return { url: 'http://localhost:3000/payment/pending' };
  }

  // ============= PAYPAL =============
  @Post('paypal/create-order')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create PayPal order' })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async createPayPalOrder(@Body() createPayPalOrderDto: CreatePayPalOrderDto) {
    return this.paymentsService.createPayPalOrder(createPayPalOrderDto);
  }

  @Post('capture-paypal-order')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Capture PayPal order' })
  @ApiResponse({ status: 200, description: 'Order captured successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async capturePayPalOrder(@Body() capturePayPalOrderDto: CapturePayPalOrderDto) {
    return this.paymentsService.capturePayPalOrder(capturePayPalOrderDto);
  }

  // ============= GENERAL =============
  @Get('payments')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @Get('payments/user/:userId')
  @ApiOperation({ summary: 'Get user payments' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User payments retrieved successfully' })
  async getUserPayments(@Param('userId', new ParseUUIDPipe()) userId: string) {
    return this.paymentsService.getUserPayments(userId);
  }
}
