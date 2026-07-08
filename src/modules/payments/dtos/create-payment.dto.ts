import { IsUUID, IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 100, description: 'Chips amount' })
  @IsNumber()
  @Min(1)
  chips: number;

  @ApiProperty({ example: '10.00', description: 'Price in local currency' })
  @IsString()
  price: string;

  @ApiProperty({
    example: 'mepago',
    description: 'Payment platform (mepago or paypal)',
    enum: ['mepago', 'paypal'],
  })
  @IsString()
  paymentPlatform: string;

  @ApiProperty({
    example: 'COP',
    description: 'Optional: Currency code. If not provided, will be determined by user country',
    required: false,
  })
  @IsOptional()
  @IsString()
  currency?: string;
}

export class CreateMercadoPagoOrderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 100, description: 'Chips amount' })
  @IsNumber()
  @Min(1)
  chips: number;

  @ApiProperty({ example: '10.00', description: 'Price in local currency' })
  @IsString()
  price: string;

  @ApiProperty({ example: 'COP', description: 'Currency code for MercadoPago' })
  @IsString()
  currency: string;
}

export class CreatePayPalOrderDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 100, description: 'Chips amount' })
  @IsNumber()
  @Min(1)
  chips: number;

  @ApiProperty({ example: '10.00', description: 'Price in USD' })
  @IsString()
  price: string;
}

export class CapturePayPalOrderDto {
  @ApiProperty({ example: '7KH28319VH5891231', description: 'PayPal Order ID' })
  @IsString()
  orderId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 100, description: 'Chips amount' })
  @IsNumber()
  @Min(1)
  chips: number;

   @ApiProperty({ example: '10.00', description: 'Price in USD' })
  @IsString()
  price: string;
}

/**
 * DTO para POST /mercadopago/create_preference
 * Estilo El_Gaalpon_de_Jose — acepta los mismos campos que el frontend
 * de referencia, más `chips` (necesario para acreditar en RoyalBack).
 */
export class CreateMpPreferenceDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'User ID (UUID)',
  })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'Royal Games - 100 Chips', description: 'Item title shown in MercadoPago' })
  @IsString()
  title: string;

  @ApiProperty({ example: 1, description: 'Quantity of items' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 10.0, description: 'Unit price in the specified currency' })
  @IsNumber()
  unit_price: number;

  @ApiProperty({ example: 'COP', description: 'ISO 4217 currency code (COP, ARS, MXN, etc.)' })
  @IsString()
  currency_id: string;

  @ApiProperty({
    example: 100,
    description: 'Chips to credit on approved payment (optional; defaults to 0)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  chips?: number;
}
