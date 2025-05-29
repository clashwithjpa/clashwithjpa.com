import type { Database as SupabaseDatabase } from './database.types';
import type { KyselifyDatabase } from 'kysely-supabase';

// This converts the Supabase database type to a Kysely-compatible type.
export type Database = KyselifyDatabase<SupabaseDatabase>;
