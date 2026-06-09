import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { AuthUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new user and return a JWT' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
          email: 'alice@example.com',
          username: 'alice_quiz',
          avatar_url: null,
          bio: null,
          created_at: '2026-06-08T04:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({
    status: 409,
    description: 'Email or username already exists.',
  })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @ApiOperation({ summary: 'Log in with email/password and return a JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 201,
    description: 'Login successful.',
    schema: {
      example: {
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        user: {
          id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
          email: 'alice@example.com',
          username: 'alice_quiz',
          avatar_url: 'https://example.com/avatars/alice.png',
          bio: 'I build and play history quizzes.',
          created_at: '2026-06-08T04:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get the current authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Current user profile.',
    schema: {
      example: {
        id: '7b40b82e-0d39-4b3f-b4ec-744d2d8d49a6',
        email: 'alice@example.com',
        username: 'alice_quiz',
        avatar_url: 'https://example.com/avatars/alice.png',
        bio: 'I build and play history quizzes.',
        created_at: '2026-06-08T04:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid bearer token.' })
  getMe(@CurrentUser() user: AuthUser) {
    return this.authService.getMe(user.id);
  }
}
