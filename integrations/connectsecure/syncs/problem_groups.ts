import { createSync } from 'nango';
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

const ProviderResponseSchema = z.object({
    data: z.array(z.unknown()),
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

        let skip = 0;
        const limit = 5000;

        // nango.paginate() is avoided here on purpose: its offset mode extracts `response_path`
        // and returns early on an empty array before `on_page` ever runs, so a provider error
        // envelope (`status: false`, empty `data`) would look identical to "no more pages" and
        // let trackDeletesEnd() below wipe every previously synced record. Manual pagination lets
        // us check `status` on every page, including empty ones, before treating it as "done".
        // eslint-disable-next-line @nangohq/custom-integrations-linting/no-while-true -- nango.paginate's offset mode returns early on an empty page before we can inspect `status`, see comment above.
        while (true) {
            // https://cybercns.atlassian.net/wiki/spaces/CVB/pages/2128314664
            const response = await nango.get({
                endpoint: '/r/company/problem_groups',
                params: {
                    skip: String(skip),
                    limit: String(limit)
                },
                headers: {
                    Authorization: `Bearer ${authData.access_token}`,
                    'X-Tenant-Id': tenant,
                    'X-User-Id': String(authData.user_id)
                },
                retries: 3
            });

            const parsedResponse = ProviderResponseSchema.parse(response.data);
            if (parsedResponse.status === false) {
                throw new Error('ConnectSecure returned a provider error while listing problem groups.');
            }

            const problemGroups = parsedResponse.data.map((item) => {
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

            if (parsedResponse.data.length < limit) {
                break;
            }
            skip += parsedResponse.data.length;
        }

        await nango.trackDeletesEnd('ProblemGroup');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
