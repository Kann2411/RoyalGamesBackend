import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitApplicationDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Applicant name' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'juan@example.com', description: 'Applicant email' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Me encantaría trabajar con ustedes porque...', description: 'Why they want to work with us' })
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message: string;
}
