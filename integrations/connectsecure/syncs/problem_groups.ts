import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProblemGroupSchema = z.object({
    id: z.string(),
    problem_group_name: z.string(),
    problem_group_type: z.string(),
    problem_group_sub_type: z.string().optional(),
    severity: z.string(),
    sequence: z.number(),
    weightage: z.number(),
    description: z.string().optional(),
    created: z.string().optional(),
    updated: z.string().optional()
});

const ProviderProblemGroupSchema = z.object({
    id: z.union([z.string(), z.number()]),
    problem_group_name: z.string(),
    problem_group_type: z.string(),
    problem_group_sub_type: z.union([z.string(), z.null()]).optional(),
    severity: z.string(),
    sequence: z.number(),
    weightage: z.number(),
    description: z.union([z.string(), z.null()]).optional(),
    created: z.string().optional(),
    updated: z.string().optional()
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

const sync = createSync({
    description: 'Sync the reference list of vulnerability/problem severity-group categories.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        ProblemGroup: ProblemGroupSchema
    },

    exec: async (nango) => {
        // Blocker: provider only exposes /r/company/problem_groups with no changed-since filter,
        // no deleted-record endpoint, and no resumable cursor.
        const connection = await nango.getConnection();
        let tenant = connection.connection_config?.['tenant'];
        if (!tenant) {
            const metadata = await nango.getMetadata();
            tenant = metadata?.['tenant'] ?? metadata?.['connection_config']?.['tenant'];
        }
        if (!tenant) {
            throw new Error('Connection config must include tenant.');
        }

        // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
        const authResponse = await nango.post({
            endpoint: '/w/authorize',
            retries: 3
        });

        const authParsed = AuthorizeResponseSchema.safeParse(authResponse.data);
        if (!authParsed.success) {
            throw new Error('Failed to obtain access_token or user_id from /w/authorize');
        }
        const authData = authParsed.data;

        await nango.trackDeletesStart('ProblemGroup');

        const proxyConfig: ProxyConfiguration = {
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            endpoint: '/r/company/problem_groups',
            headers: {
                Authorization: `Bearer ${authData.access_token}`,
                'X-Tenant-Id': tenant,
                'X-User-Id': String(authData.user_id)
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'skip',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'limit',
                limit: 5000,
                response_path: 'data'
            },
            retries: 3
        };

        for await (const page of nango.paginate(proxyConfig)) {
            const problemGroups = page.map((item) => {
                const group = ProviderProblemGroupSchema.parse(item);
                return {
                    id: String(group.id),
                    problem_group_name: group.problem_group_name,
                    problem_group_type: group.problem_group_type,
                    ...(group.problem_group_sub_type != null && { problem_group_sub_type: group.problem_group_sub_type }),
                    severity: group.severity,
                    sequence: group.sequence,
                    weightage: group.weightage,
                    ...(group.description != null && { description: group.description }),
                    ...(group.created !== undefined && { created: group.created }),
                    ...(group.updated !== undefined && { updated: group.updated })
                };
            });

            if (problemGroups.length > 0) {
                await nango.batchSave(problemGroups, 'ProblemGroup');
            }
        }

        await nango.trackDeletesEnd('ProblemGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
