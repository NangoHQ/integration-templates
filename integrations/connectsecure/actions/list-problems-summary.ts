import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    limit: z.number().int().positive().optional().describe('Maximum number of records to return. Example: 5000'),
    cursor: z.string().optional().describe('Pagination cursor (skip offset) from the previous response. Omit for the first page.'),
    sort: z.string().optional().describe('Optional sort expression. Example: "problem_name asc"')
});

const ProblemSchema = z.object({
    problem_name: z.string().optional(),
    severity: z.string().optional(),
    affected_assets: z.number().optional(),
    affected_companies: z.number().optional(),
    software_name: z.union([z.string(), z.array(z.string())]).optional()
});

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()).optional(),
    status: z.boolean().optional(),
    total: z.number().optional()
});

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

const OutputSchema = z.object({
    problems: z.array(ProblemSchema),
    total: z.number(),
    next_cursor: z.string().optional()
});

const action = createAction({
    description:
        'List a summarized, deduplicated view of security problems/vulnerabilities across the account (one row per distinct problem, with aggregate asset/company counts).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.cursor !== undefined && !/^\d+$/.test(input.cursor)) {
            throw new nango.ActionError({
                type: 'invalid_cursor',
                message: 'cursor must be a valid numeric skip offset'
            });
        }
        const skip = input.cursor ? parseInt(input.cursor, 10) : 0;
        const connection = await nango.getConnection();
        const config = connection.connection_config ?? {};

        const tenant = typeof config['tenant'] === 'string' ? config['tenant'] : undefined;

        if (!tenant) {
            throw new nango.ActionError({
                type: 'missing_connection_config',
                message: 'Connection config must include tenant.'
            });
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authResponse.data);
        const accessToken = authParsed.success ? authParsed.data.access_token : undefined;
        const userId = authParsed.success ? authParsed.data.user_id : undefined;

        if (!accessToken || !userId) {
            throw new nango.ActionError({
                type: 'auth_failed',
                message: 'Failed to obtain access_token or user_id from authorization endpoint.'
            });
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const dataResponse = await nango.get({
            endpoint: '/r/report_queries/problems_summary',
            params: {
                ...(input.limit !== undefined && { limit: String(input.limit) }),
                ...(skip > 0 && { skip: String(skip) }),
                ...(input.sort !== undefined && { sort: input.sort })
            },
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': userId
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(dataResponse.data);
        const rawProblems = providerResponse.data ?? [];
        const total = providerResponse.total ?? 0;

        const problems = rawProblems.map((item) => {
            const parsed = z.object({}).passthrough().parse(item);
            const rawSoftwareName = parsed['software_name'];
            const softwareName =
                typeof rawSoftwareName === 'string'
                    ? rawSoftwareName
                    : Array.isArray(rawSoftwareName) && rawSoftwareName.length > 0
                      ? rawSoftwareName.join(', ')
                      : undefined;
            return {
                ...(typeof parsed['problem_name'] === 'string' && { problem_name: parsed['problem_name'] }),
                ...(typeof parsed['severity'] === 'string' && { severity: parsed['severity'] }),
                ...(typeof parsed['affected_assets'] === 'number' && { affected_assets: parsed['affected_assets'] }),
                ...(typeof parsed['affected_companies'] === 'number' && { affected_companies: parsed['affected_companies'] }),
                ...(softwareName !== undefined && { software_name: softwareName })
            };
        });

        const nextSkip = skip + problems.length;
        const nextCursor = problems.length > 0 && nextSkip < total ? String(nextSkip) : undefined;

        return {
            problems,
            total,
            ...(nextCursor !== undefined && { next_cursor: nextCursor })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
