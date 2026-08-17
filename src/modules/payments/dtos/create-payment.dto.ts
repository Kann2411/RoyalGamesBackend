import { IsUUID, IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

/**
 * DTO para POST /mepago/create-order/:country (ar | co | mx).
 * A diferencia de CreateMercadoPagoOrderDto, no recibe `currency`: la moneda
 * queda fija según el país de la ruta, para que sea imposible mandar una
 * moneda que no coincide con la cuenta vendedora real de ese país.
 */
export class CreateMercadoPagoOrderByCountryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 100, description: 'Chips amount' })
  @IsNumber()
  @Min(1)
  chips: number;

  @ApiProperty({ example: '10.00', description: 'Price in the destination country currency' })
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
