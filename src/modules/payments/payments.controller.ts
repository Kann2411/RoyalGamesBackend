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
  ForbiddenException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreateMercadoPagoOrderDto,
  CreatePayPalOrderDto,
  CapturePayPalOrderDto,
} from './dtos/create-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) { }

  // ============= MERCADOPAGO =============
  @Post('mepago/create-order')
  @HttpCode(HttpStatus.CREATED)
  // @UseGuards(JwtAuthGuard) ------------FALTA MANEJAR EL ROL QUE ESTA EN EL TOKEN DESDE EL FRONTEND-------------
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
    @Query('id') id?: string,
    @Query('topic') topic?: string,
  ) {
    await this.paymentsService.handleMercadoPagoWebhook(data, { id, topic });
    return { status: 'received' };
  }

  @Get('mercadopago/success')
  @ApiOperation({ summary: 'MercadoPago success redirect → frontend' })
  async mercadoPagoSuccess(@Query() query: any, @Res() res: Response) {
    // MercadoPago redirige aquí tras pago aprobado.
    // Reenviamos al frontend con los query params originales para que pueda
    // mostrar el estado del pago al usuario.
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:3000';
    const { id, userId } = query;
    const redirectTo = id || userId
      ? `${frontendUrl}/mercadopago/success?id=${id ?? ''}&userId=${userId ?? ''}`
      : `${frontendUrl}/mercadopago/success`;
    return res.redirect(301, redirectTo);
  }

  @Get('mercadopago/failure')
  @ApiOperation({ summary: 'MercadoPago failure redirect → frontend' })
  async mercadoPagoFailure(@Query() query: any, @Res() res: Response) {
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:3000';
    const { id, userId } = query;
    const redirectTo = id || userId
      ? `${frontendUrl}/mercadopago/failure?id=${id ?? ''}&userId=${userId ?? ''}`
      : `${frontendUrl}/mercadopago/failure`;
    return res.redirect(301, redirectTo);
  }

  @Get('mercadopago/pending')
  @ApiOperation({ summary: 'MercadoPago pending redirect → frontend' })
  async mercadoPagoPending(@Query() query: any, @Res() res: Response) {
    const frontendUrl =
      process.env.FRONTEND_URL || 'http://localhost:3000';
    const { id, userId } = query;
    const redirectTo = id || userId
      ? `${frontendUrl}/mercadopago/pending?id=${id ?? ''}&userId=${userId ?? ''}`
      : `${frontendUrl}/mercadopago/pending`;
    return res.redirect(301, redirectTo);
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all payments (Admin only)' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getAllPayments() {
    return this.paymentsService.getAllPayments();
  }

  @Get('payments/user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user payments (self or admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User payments retrieved successfully' })
  async getUserPayments(
    @Param('userId', new ParseUUIDPipe()) userId: string,
    @CurrentUser() currentUser: any,
  ) {
    if (currentUser.id !== userId && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Cannot view another user\'s payments');
    }
    return this.paymentsService.getUserPayments(userId);
  }
}
