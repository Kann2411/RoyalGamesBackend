import { IsUUID, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 100, description: 'Chips amount' })
  @IsNumber()
  @Min(1)
  chips: number;

  @ApiProperty({ example: '10.00', description: 'Price in currency' })
  @IsString()
  price: string;

  @ApiProperty({ example: 'mepago', description: 'Payment platform' })
  @IsString()
  paymentPlatform: string;
}

export class CreateMercadoPagoOrderDto {
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
