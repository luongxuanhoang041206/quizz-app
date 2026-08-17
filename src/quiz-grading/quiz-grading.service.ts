import { Injectable } from '@nestjs/common';

export interface QuizGradingResult {
  isCorrect: boolean;
  score: number;
}

@Injectable()
export class QuizGradingService {
  gradeQuestion(question: any, submittedAnswer: unknown, timeTaken?: number): QuizGradingResult {
    const isCorrect = this.isAnswerCorrect(question, submittedAnswer);
    const score = isCorrect ? this.calculateScore(question, timeTaken) : 0;
    return { isCorrect, score };
  }

  private calculateScore(question: any, timeTaken?: number): number {
    const timeLimit = Number(question?.time_limit);
    if (!Number.isNaN(timeLimit) && timeLimit > 0 && typeof timeTaken === 'number') {
      const safeTimeTaken = Math.max(0, Math.min(timeTaken, timeLimit));
      const ratio = 1 - safeTimeTaken / timeLimit;
      return Math.round(500 + 500 * ratio);
    }

    const points = Number(question?.points);
    return Number.isFinite(points) && points >= 0 ? points : 0;
  }

  private isAnswerCorrect(question: any, submittedAnswer: unknown): boolean {
    if (!question || question.correct_answer === undefined || question.correct_answer === null) {
      return false;
    }

    const correct = question.correct_answer;
    const options: string[] = Array.isArray(question.options) ? question.options.map((opt) => String(opt)) : [];
    const qType = String(question.type ?? '').toUpperCase();

    const correctIndices = this.resolveCorrectIndices(correct, options);
    const submittedIndex = this.resolveSubmittedIndex(submittedAnswer, options);

    if (qType === 'SINGLE_CHOICE' || qType === 'MULTIPLE_CHOICE') {
      return submittedIndex !== null && correctIndices.includes(submittedIndex);
    }

    if (qType === 'TRUE_FALSE') {
      const correctBool = this.resolveBooleanCorrectAnswer(correct, options, correctIndices);
      const submittedBool = this.normalizeBooleanSubmittedAnswer(submittedAnswer, options, submittedIndex);
      return submittedBool !== null && correctBool === submittedBool;
    }

    if (qType === 'FILL_BLANK' || qType === 'SHORT_TEXT') {
      const correctText = this.normalizeTextAnswer(correct);
      const submittedText = this.normalizeTextAnswer(submittedAnswer);
      return correctText !== null && submittedText !== null && correctText === submittedText;
    }

    if (submittedIndex !== null && correctIndices.length > 0) {
      return correctIndices.includes(submittedIndex);
    }

    return JSON.stringify(correct) === JSON.stringify(submittedAnswer);
  }

  private resolveCorrectIndices(correct: unknown, options: string[]): number[] {
    const indices: number[] = [];
    const pushIndex = (value: unknown) => {
      const n = Number(value);
      if (Number.isInteger(n) && n >= 0 && n < options.length && !indices.includes(n)) {
        indices.push(n);
      }
    };

    if (typeof correct === 'object' && correct !== null) {
      const record = correct as Record<string, unknown>;

      if (Array.isArray(record.indices)) {
        record.indices.forEach(pushIndex);
      }

      if (record.index !== undefined) {
        pushIndex(record.index);
      }

      if (Array.isArray(record.values)) {
        record.values.forEach((val) => {
          const idx = options.findIndex((option) => option === String(val));
          if (idx >= 0) pushIndex(idx);
        });
      }

      if (typeof record.value === 'string') {
        const idx = options.findIndex((option) => option === record.value);
        if (idx >= 0) pushIndex(idx);
      }

      if (typeof record.answer === 'string') {
        const idx = options.findIndex((option) => option === record.answer);
        if (idx >= 0) pushIndex(idx);
      }

      return indices;
    }

    if (typeof correct === 'string') {
      const idx = options.findIndex((option) => option === correct);
      if (idx >= 0) indices.push(idx);
    }

    return indices;
  }

  private resolveSubmittedIndex(submittedAnswer: unknown, options: string[]): number | null {
    if (typeof submittedAnswer === 'number') {
      return Number.isInteger(submittedAnswer) ? submittedAnswer : null;
    }

    if (typeof submittedAnswer === 'string') {
      const numeric = Number(submittedAnswer);
      if (Number.isInteger(numeric) && !Number.isNaN(numeric)) {
        return numeric;
      }
      const idx = options.findIndex((option) => option === submittedAnswer);
      return idx >= 0 ? idx : null;
    }

    if (typeof submittedAnswer === 'object' && submittedAnswer !== null) {
      const record = submittedAnswer as Record<string, unknown>;
      if (record.index !== undefined && record.index !== null) {
        const numeric = Number(record.index);
        if (Number.isInteger(numeric) && !Number.isNaN(numeric)) {
          return numeric;
        }
      }
      if (typeof record.value === 'string') {
        const idx = options.findIndex((option) => option === record.value);
        if (idx >= 0) return idx;
      }
      if (typeof record.answer === 'string') {
        const idx = options.findIndex((option) => option === record.answer);
        if (idx >= 0) return idx;
      }
    }

    return null;
  }

  private normalizeBooleanSubmittedAnswer(submittedAnswer: unknown, options: string[], submittedIndex: number | null): boolean | null {
    if (typeof submittedAnswer === 'boolean') {
      return submittedAnswer;
    }

    if (typeof submittedAnswer === 'string') {
      const lower = submittedAnswer.trim().toLowerCase();
      if (lower === 'true') return true;
      if (lower === 'false') return false;
    }

    if (typeof submittedAnswer === 'object' && submittedAnswer !== null) {
      const record = submittedAnswer as Record<string, unknown>;
      if (record.value !== undefined) {
        return Boolean(record.value);
      }
      if (record.answer !== undefined) {
        return Boolean(record.answer);
      }
    }

    if (submittedIndex !== null) {
      const option = options[submittedIndex]?.trim().toLowerCase();
      if (option === 'true') return true;
      if (option === 'false') return false;
    }

    return null;
  }

  private resolveBooleanCorrectAnswer(correct: unknown, options: string[], correctIndices: number[]): boolean {
    if (typeof correct === 'object' && correct !== null) {
      const record = correct as Record<string, unknown>;
      if (typeof record.value === 'boolean') {
        return record.value;
      }
      if (typeof record.answer === 'boolean') {
        return record.answer;
      }
      if (typeof record.value === 'string') {
        const lower = record.value.trim().toLowerCase();
        return lower === 'true';
      }
      if (typeof record.answer === 'string') {
        const lower = record.answer.trim().toLowerCase();
        return lower === 'true';
      }
    }

    if (correctIndices.length > 0) {
      const option = options[correctIndices[0]]?.trim().toLowerCase();
      return option === 'true';
    }

    return false;
  }

  private normalizeTextAnswer(value: unknown): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      if (typeof record.value === 'string') {
        return record.value.trim().toLowerCase();
      }
      if (typeof record.answer === 'string') {
        return record.answer.trim().toLowerCase();
      }
      return JSON.stringify(record).trim().toLowerCase();
    }
    return String(value).trim().toLowerCase();
  }
}
