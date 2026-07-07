import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dtos/login.dto';
import { GoogleAuthDto } from './dtos/google-auth.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login or register with Google',
    description:
      'Receives a Google id_token, verifies it, and returns a Royal Games JWT. ' +
      'Creates the user automatically if it does not exist.',
  })
  @ApiResponse({ status: 200, description: 'Login successful, returns access_token and user data' })
  @ApiResponse({ status: 401, description: 'Invalid or expired Google token' })
  async loginWithGoogle(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.loginWithGoogle(googleAuthDto.token);
  }
}
