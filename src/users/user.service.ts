/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from 'src/database/database.module';
import { UpdateUserDto } from './dto/UpdateUserDto';
@Injectable()
export class UserService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getUser(userId: string) {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('id, email, username, avatar_url, bio, created_at')
      .eq('id', userId)
      .single();

    if (error) {
      throw new NotFoundException(error.message);
    }

    return user;
  }

  async updateUser(userId: string, dto: UpdateUserDto) {
    const { data, error } = await this.supabase
      .from('users')
      .update({
        username: dto.username,
        avatar_url: dto.avatar_url,
        bio: dto.bio,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async userQuizz(userId: string) {
    const { data, error } = await this.supabase
      .from('quizzes')
      .select('*')
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);

    return data;
  }

  async userQuizzAttemps(userId: string) {
    const { data, error } = await this.supabase
      .from('attempts')
      .select(
        `
                id,
                score,
                completed_at,
                quizzes(
                    id,
                    title,
                    description
                    )
                `,
      )
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
