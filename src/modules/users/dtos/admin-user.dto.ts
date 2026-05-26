import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';

export class AdminUserDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'User ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: Role.ADMIN, description: 'User role', enum: Role })
  @IsEnum(Role)
  role: Role;
}
