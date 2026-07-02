import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderHookSchema = z.object({
    id: z.number().int(),
    name: z.string(),
    teamId: z.number().int(),
    udid: z.string().optional(),
    type: z.string().optional(),
    packageName: z.string().nullable().optional(),
    theme: z.string().nullable().optional(),
    flags: z.object({ form: z.boolean().optional() }).optional(),
    editable: z.boolean().optional(),
    queueCount: z.number().int().optional(),
    queueLimit: z.number().int().optional(),
    enabled: z.boolean().optional(),
    gone: z.boolean().optional(),
    typeName: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    scenarioId: z.number().int().nullable().optional(),
    url: z.string().optional()
});

const HookSchema = z.object({
    id: z.string(),
    name: z.string(),
    teamId: z.number().int(),
    udid: z.string().optional(),
    type: z.string().optional(),
    packageName: z.string().optional(),
    theme: z.string().optional(),
    flags: z.object({ form: z.boolean().optional() }).optional(),
    editable: z.boolean().optional(),
    queueCount: z.number().int().optional(),
    queueLimit: z.number().int().optional(),
    enabled: z.boolean().optional(),
    gone: z.boolean().optional(),
    typeName: z.string().optional(),
    data: z.record(z.string(), z.unknown()).optional(),
    scenarioId: z.number().int().nullable().optional(),
    url: z.string().optional()
});

const sync = createSync({
    description: 'Sync webhooks/mailhooks for a team',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Hook: HookSchema
    },

    exec: async (nango) => {
        const OrgSchema = z.object({
            id: z.number().int(),
            name: z.string().optional(),
            zone: z.string().optional()
        });
        const TeamSchema = z.object({
            id: z.number().int(),
            name: z.string().optional(),
            organizationId: z.number().int().optional()
        });

        const orgProxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/organizations',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pg[limit]',
                limit: 1000,
                response_path: 'organizations'
            },
            retries: 3
        };

        const teams: Array<z.infer<typeof TeamSchema>> = [];
        for await (const orgPage of nango.paginate<unknown>(orgProxyConfig)) {
            const parsedOrgs = z.array(OrgSchema).safeParse(orgPage);
            if (!parsedOrgs.success) {
                throw new Error(`Failed to parse organizations page: ${parsedOrgs.error.message}`);
            }

            for (const org of parsedOrgs.data) {
                const teamProxyConfig: ProxyConfiguration = {
                    // https://developers.make.com/api-documentation/
                    endpoint: '/teams',
                    params: {
                        organizationId: org.id
                    },
                    paginate: {
                        type: 'offset',
                        offset_name_in_request: 'pg[offset]',
                        offset_calculation_method: 'per-page',
                        limit_name_in_request: 'pg[limit]',
                        limit: 1000,
                        response_path: 'teams'
                    },
                    retries: 3
                };

                for await (const teamPage of nango.paginate<unknown>(teamProxyConfig)) {
                    const parsedTeams = z.array(TeamSchema).safeParse(teamPage);
                    if (!parsedTeams.success) {
                        throw new Error(`Failed to parse teams page: ${parsedTeams.error.message}`);
                    }
                    teams.push(...parsedTeams.data);
                }
            }
        }

        if (teams.length === 0) {
            throw new Error('No teams found');
        }

        await nango.trackDeletesStart('Hook');

        for (const team of teams) {
            const proxyConfig: ProxyConfiguration = {
                // https://developers.make.com/api-documentation/
                endpoint: '/hooks',
                params: {
                    teamId: team.id,
                    'pg[sortBy]': 'id',
                    'pg[sortDir]': 'asc'
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'pg[offset]',
                    offset_calculation_method: 'by-response-size',
                    limit_name_in_request: 'pg[limit]',
                    limit: 50,
                    response_path: 'hooks'
                },
                retries: 3
            };

            for await (const page of nango.paginate(proxyConfig)) {
                if (!Array.isArray(page)) {
                    throw new Error('Expected page to be an array');
                }

                const hooks = page.map((item: unknown) => {
                    const parsed = ProviderHookSchema.safeParse(item);
                    if (!parsed.success) {
                        throw new Error(`Failed to parse hook: ${parsed.error.message}`);
                    }
                    const record = parsed.data;
                    return {
                        id: String(record.id),
                        name: record.name,
                        teamId: record.teamId,
                        ...(record.udid != null && { udid: record.udid }),
                        ...(record.type != null && { type: record.type }),
                        ...(record.packageName != null && { packageName: record.packageName }),
                        ...(record.theme != null && { theme: record.theme }),
                        ...(record.flags != null && { flags: record.flags }),
                        ...(record.editable != null && { editable: record.editable }),
                        ...(record.queueCount != null && { queueCount: record.queueCount }),
                        ...(record.queueLimit != null && { queueLimit: record.queueLimit }),
                        ...(record.enabled != null && { enabled: record.enabled }),
                        ...(record.gone != null && { gone: record.gone }),
                        ...(record.typeName != null && { typeName: record.typeName }),
                        ...(record.data != null && { data: record.data }),
                        ...(record.scenarioId !== undefined && { scenarioId: record.scenarioId }),
                        ...(record.url != null && { url: record.url })
                    };
                });

                if (hooks.length > 0) {
                    await nango.batchSave(hooks, 'Hook');
                }
            }
        }

        await nango.trackDeletesEnd('Hook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
