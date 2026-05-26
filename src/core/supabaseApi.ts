import type { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { AppError, type Result, toAppError } from './errors';

type RpcArgs = Record<string, unknown> | undefined;

function getSchemaError(error: z.ZodError): AppError {
  return new AppError(`Invalid API payload: ${error.issues.map((issue) => issue.message).join(', ')}`, {
    code: 'INVALID_PAYLOAD',
    cause: error,
  });
}

export async function rpcSingle<T>(
  client: SupabaseClient | null,
  fn: string,
  args: RpcArgs,
  schema: z.ZodType<T>,
  options?: { missingConfigMessage?: string },
): Promise<Result<T>> {
  if (!client) {
    return {
      ok: false,
      error: new AppError(options?.missingConfigMessage ?? 'Supabase is not configured.', {
        code: 'SUPABASE_NOT_CONFIGURED',
      }),
    };
  }

  try {
    const { data, error } = await client.rpc(fn, args).single();
    if (error) {
      return { ok: false, error: new AppError(error.message, { code: 'RPC_ERROR', cause: error }) };
    }

    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      return { ok: false, error: getSchemaError(parsed.error) };
    }

    return { ok: true, data: parsed.data };
  } catch (error) {
    return {
      ok: false,
      error: toAppError(error, `Failed to call RPC "${fn}".`, 'RPC_FAILED'),
    };
  }
}

export { z };

