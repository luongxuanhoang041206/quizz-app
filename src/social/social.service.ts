import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from '../database/database.module';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class SocialService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) { }

  /**
   * Toggle Like - Thêm hoặc xóa like
   * - Nếu chưa like: insert vào bảng likes + tăng like_count của quiz
   * - Nếu rồi: delete khỏi bảng likes + giảm like_count của quiz
   * Trả về: { liked: boolean }
   */
  async toggleLike(quizId: string, userId: string) {
    //Kiểm tra quiz tồn tại
    const { data: quiz, error: quizError } = await this.supabase
      .from('quizzes')
      .select('id, like_count')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    //Kiểm tra user đã like bài này chưa
    const { data: existingLike, error: checkError } = await this.supabase
      .from('likes')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .single();

    if (!checkError && existingLike) {
      //Nếu đã like -> Unlike (xóa like + giảm like_count)
      await this.supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('quiz_id', quizId);

      // Giảm like_count của quiz
      const newLikeCount = Math.max(0, (quiz.like_count || 0) - 1);
      await this.supabase
        .from('quizzes')
        .update({ like_count: newLikeCount })
        .eq('id', quizId);

      return { liked: false };
    } else {
      //Nếu chưa like -> Like (thêm like + tăng like_count)
      const { error: insertError } = await this.supabase
        .from('likes')
        .insert({
          user_id: userId,
          quiz_id: quizId,
        });

      if (insertError) {
        throw new BadRequestException('Không thể thêm like');
      }

      // Tăng like_count của quiz
      const newLikeCount = (quiz.like_count || 0) + 1;
      await this.supabase
        .from('quizzes')
        .update({ like_count: newLikeCount })
        .eq('id', quizId);

      return { liked: true };
    }
  }

  /**
   * Toggle Bookmark - Thêm hoặc xóa bookmark
   * - Nếu chưa bookmark: insert vào bảng bookmarks
   * - Nếu rồi: delete khỏi bảng bookmarks
   * Trả về: { bookmarked: boolean }
   */
  async toggleBookmark(quizId: string, userId: string) {
    //Kiểm tra quiz tồn tại
    const { data: quiz, error: quizError } = await this.supabase
      .from('quizzes')
      .select('id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    //Kiểm tra user đã bookmark bài này chưa
    const { data: existingBookmark, error: checkError } = await this.supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('quiz_id', quizId)
      .single();

    if (!checkError && existingBookmark) {
      //Nếu đã bookmark -> Remove bookmark
      await this.supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', userId)
        .eq('quiz_id', quizId);

      return { bookmarked: false };
    } else {
      //Nếu chưa bookmark -> Add bookmark
      const { error: insertError } = await this.supabase
        .from('bookmarks')
        .insert({
          user_id: userId,
          quiz_id: quizId,
        });

      if (insertError) {
        throw new BadRequestException('Không thể thêm bookmark');
      }

      return { bookmarked: true };
    }
  }

  /**
   * Get Comments - Lấy danh sách bình luận của một quiz
   */
  async getComments(quizId: string) {
    // Kiểm tra quiz tồn tại
    const { data: quiz, error: quizError } = await this.supabase
      .from('quizzes')
      .select('id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    // Lấy comments kèm thông tin user
    const { data: comments, error: commentsError } = await this.supabase
      .from('comments')
      .select(
        `
        id,
        content,
        created_at,
        updated_at,
        users(username, avatar_url)
        `,
      )
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      throw new BadRequestException('Không thể tải bình luận');
    }

    return (comments || []).map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      user: {
        username: comment.users?.username,
        avatar_url: comment.users?.avatar_url,
      },
    }));
  }

  /**
   * Add Comment - Thêm bình luận mới
   */
  async addComment(quizId: string, userId: string, createCommentDto: CreateCommentDto) {
    //Kiểm tra quiz tồn tại
    const { data: quiz, error: quizError } = await this.supabase
      .from('quizzes')
      .select('id')
      .eq('id', quizId)
      .single();

    if (quizError || !quiz) {
      throw new NotFoundException('Quiz không tồn tại');
    }

    //Kiểm tra nội dung không rỗng
    if (!createCommentDto.content || createCommentDto.content.trim().length === 0) {
      throw new BadRequestException('Nội dung bình luận không được để trống');
    }

    //Insert comment vào DB
    const { data: comment, error: insertError } = await this.supabase
      .from('comments')
      .insert({
        user_id: userId,
        quiz_id: quizId,
        content: createCommentDto.content.trim(),
      })
      .select('id, content, created_at, updated_at')
      .single();

    if (insertError || !comment) {
      throw new BadRequestException(insertError?.message || 'Không thể thêm bình luận');
    }

    return comment;
  }

  /**
   * Delete Comment - Xóa bình luận
   */
  async deleteComment(commentId: string, userId: string) {
    // Bước 1: Lấy thông tin comment
    const { data: comment, error: commentError } = await this.supabase
      .from('comments')
      .select('id, user_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      throw new NotFoundException('Bình luận không tồn tại');
    }

    // Kiểm tra quyền sở hữu
    if (comment.user_id !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa bình luận của người khác');
    }

    //Xóa comment
    const { error: deleteError } = await this.supabase
      .from('comments')
      .delete()
      .eq('id', commentId);

    if (deleteError) {
      throw new BadRequestException(deleteError.message || 'Không thể xóa bình luận');
    }

    return { message: 'Bình luận đã được xóa thành công' };
  }

  create(createSocialDto: any) {
    return 'This action adds a new social';
  }

  findAll() {
    return `This action returns all social`;
  }

  findOne(id: number) {
    return `This action returns a #${id} social`;
  }

  update(id: number, updateSocialDto: any) {
    return `This action updates a #${id} social`;
  }

  remove(id: number) {
    return `This action removes a #${id} social`;
  }
}
