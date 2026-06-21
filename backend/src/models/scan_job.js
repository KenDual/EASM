import { z } from 'zod';

export const ScanTypeEnum = z.enum([
    'dns',
    'whois',
    'subdomain',
    'cert_trans',
    'asn',
    'ip',
    'port',
    'ssl',
    'tech',
    'all',
]);

export const ScanJobStatusEnum = z.enum(['pending', 'running', 'completed', 'failed', 'partial']);

export const CreateScanJobSchema = z.object({
    scan_type: ScanTypeEnum,
});

export const ScanJobSchema = CreateScanJobSchema.extend({
    id: z.string().uuid(),
    asset_id: z.string().uuid(),
    status: ScanJobStatusEnum,
    started_at: z.string().nullable(),
    ended_at: z.string().nullable(),
    error: z.string(),
    created_at: z.string(),
});
