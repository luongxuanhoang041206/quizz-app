// src/database/database.module.ts
import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_CLIENT = 'SUPABASE_CLIENT'

@Global()
@Module({
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SupabaseClient =>
        createClient(
          config.get<string>('SUPABASE_URL')!,
          config.get<string>('SUPABASE_SERVICE_KEY')!,
        ),
    },
  ],
  exports: [SUPABASE_CLIENT],
})
export class DatabaseModule {}