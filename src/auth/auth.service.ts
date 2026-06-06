/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SupabaseClient } from '@supabase/supabase-js';
import * as bcrypt from 'bcrypt';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
@Injectable()
export class AuthService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const { data: existing } = await this.supabase
      .from('users')
      .select('id')
      .eq('email', dto.email)
      .single();

    if (existing) throw new ConflictException('Email da duoc su dung');

    const { data: existingUsername } = await this.supabase
      .from('users')
      .select('id')
      .eq('username', dto.username)
      .single();

    if (existingUsername)
      throw new ConflictException('Username da duoc su dung');

    const password_hash = await bcrypt.hash(dto.password, 10);

    const { data: user, error } = await this.supabase
      .from('users')
      .insert({ email: dto.email, username: dto.username, password_hash })
      .select('id, email, username, avatar_url, bio, created_at')
      .single();

    if (error) throw new Error(error.message);

    const token = this.signToken(user.id, user.email);

    return { access_token: token, user };
  }

  async login(dto: LoginDto) {
    const { data: user } = await this.supabase
      .from('users')
      .select('id, email, username, password_hash, avatar_url, bio, created_at')
      .eq('email', dto.email)
      .single();

    if (!user) throw new UnauthorizedException('Email or password ko dung');

    const isMatch = await bcrypt.compare(dto.password, user.password_hash);
    if (!isMatch) throw new UnauthorizedException('Email or password ko dung');

    const token = this.signToken(user.id, user.email);

    const safeUser = {
      id: user.id,
      email: user.email,
      username: user.username,
      avatar_url: user.avatar_url,
      bio: user.bio,
      created_at: user.created_at,
    };
    return { access_token: token, user: safeUser };
  }

  async getMe(userId: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, email, username, avatar_url, bio, created_at')
      .eq('id', userId)
      .single();

    if (error) throw new UnauthorizedException(error.message);

    return user;
  }

  private signToken(userId: string, email: string): string {
    return this.jwtService.sign({ sub: userId, email });
  }
}
