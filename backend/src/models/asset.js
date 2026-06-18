import { z } from 'zod';

export const AssetTypeEnum = z.enum(['domain', 'ip']);
export const AssetStatusEnum = z.enum(['active', 'inactive']);

export const CreateAssetSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9._\-:/]+$/, 'Invalid asset name'),
  type: AssetTypeEnum,
  status: AssetStatusEnum.optional().default('active'),
});

export const AssetSchema = CreateAssetSchema.extend({
  id: z.string().uuid(),
  created_at: z.string(),
  updated_at: z.string(),
});
