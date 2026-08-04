import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (skip offset). Omit for the first page.'),
    limit: z.number().int().positive().optional().describe('Maximum number of items to return. Example: 50'),
    condition: z.string().optional().describe('SQL-like filter condition. Example: "base_score>9"')
});

function isRecord(obj: unknown): obj is Record<string, unknown> {
    return typeof obj === 'object' && obj !== null;
}

const AuthorizeResponseSchema = z
    .object({
        access_token: z.string().optional(),
        user_id: z.union([z.string(), z.number()]).optional(),
        data: z
            .object({
                access_token: z.string().optional(),
                user_id: z.union([z.string(), z.number()]).optional()
            })
            .optional()
    })
    .transform((val) => ({
        access_token: val.access_token ?? val.data?.access_token,
        user_id: val.user_id !== undefined ? String(val.user_id) : val.data?.user_id !== undefined ? String(val.data.user_id) : undefined
    }))
    .refine((val): val is { access_token: string; user_id: string } => typeof val.access_token === 'string' && typeof val.user_id === 'string', {
        message: 'Authorize response missing access_token or user_id'
    });

const ProviderVulnerabilitySchema = z
    .object({
        affected_assets: z.number().optional(),
        asset_ids: z.unknown().optional(),
        base_score: z.number().optional(),
        cs_score: z.number().optional(),
        description: z.string().optional(),
        epss_score: z.number().optional(),
        problem_name: z.string().optional(),
        severity: z.string().optional()
    })
    .passthrough();

const ProviderResponseSchema = z.object({
    data: z.array(ProviderVulnerabilitySchema).optional(),
    status: z.boolean().optional(),
    total: z.number().optional()
});

const OutputItemSchema = z.object({
    affected_assets: z.number().optional(),
    asset_ids: z.array(z.string()).optional(),
    base_score: z.number().optional(),
    cs_score: z.number().optional(),
    cve_id: z.string().optional(),
    description: z.string().optional(),
    epss_score: z.number().optional(),
    severity: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OutputItemSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List distinct vulnerabilities (CVEs) detected across assets in this account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid skip offset integer'
            });
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        if (!Number.isSafeInteger(skip)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid skip offset integer'
            });
        }

        const limit = input.limit ?? 50;

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.parse(authResponse.data);
        const token = authParsed.access_token;
        const userId = authParsed.user_id;

        if (!token || !userId) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access token or user id from authorization endpoint'
            });
        }

        const metadata = await nango.getMetadata();
        const tenant = isRecord(metadata) && typeof metadata['tenant'] === 'string' ? metadata['tenant'] : undefined;

        if (!tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Tenant is missing in connection metadata'
            });
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const response = await nango.get({
            endpoint: '/r/report_queries/vulnerabilities_details',
            params: {
                skip: String(skip),
                limit: String(limit),
                ...(input.condition !== undefined && { condition: input.condition })
            },
            headers: {
                Authorization: `Bearer ${token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.safeParse(response.data);
        if (!parsed.success) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Unexpected response shape from vulnerabilities endpoint',
                details: parsed.error.message
            });
        }

        const rows = parsed.data.data ?? [];
        const total = parsed.data.total ?? 0;

        const items = rows.map((row) => {
            const rawAssetIds = row.asset_ids;
            let asset_ids: string[] | undefined;
            if (Array.isArray(rawAssetIds)) {
                asset_ids = rawAssetIds.map((id) => (typeof id === 'string' ? id : String(id))).filter((id) => id.length > 0);
            }

            return {
                ...(row.affected_assets !== undefined && { affected_assets: row.affected_assets }),
                ...(asset_ids !== undefined && { asset_ids }),
                ...(row.base_score !== undefined && { base_score: row.base_score }),
                ...(row.cs_score !== undefined && { cs_score: row.cs_score }),
                ...(row.problem_name !== undefined && { cve_id: row.problem_name }),
                ...(row.description !== undefined && { description: row.description }),
                ...(row.epss_score !== undefined && { epss_score: row.epss_score }),
                ...(row.severity !== undefined && { severity: row.severity })
            };
        });

        const nextSkip = skip + rows.length;
        const next_cursor = rows.length > 0 && nextSkip < total ? String(nextSkip) : undefined;

        return {
            items,
            ...(next_cursor !== undefined && { next_cursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
