export class Attempt {
    id!: string;
    user_id!: string;
    quiz_id!: string;
    answers!: any;
    score!: number;
    total_points!: number;
    status!: 'started' | 'completed' | string;
    started_at!: Date;
    submitted_at!: Date | null;
}
