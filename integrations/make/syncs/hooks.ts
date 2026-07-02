import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const ProviderHookSchema = z.object({
    id: z.number().int(),
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
        // https://developers.make.com/api-documentation/
        const orgsResponse = await nango.get({
            endpoint: '/organizations',
            retries: 3
        });

        const OrgsSchema = z.object({
            organizations: z.array(
                z.object({
                    id: z.number().int(),
                    name: z.string().optional(),
                    zone: z.string().optional()
                })
            )
        });
        const parsedOrgs = OrgsSchema.safeParse(orgsResponse.data);
        if (!parsedOrgs.success) {
            throw new Error(`Failed to parse organizations: ${parsedOrgs.error.message}`);
        }
        const organizations = parsedOrgs.data.organizations;
        const org = organizations.at(0);
        if (org === undefined) {
            throw new Error('No organizations found');
        }
        const orgId = org.id;

        // https://developers.make.com/api-documentation/
        const teamsResponse = await nango.get({
            endpoint: '/teams',
            params: {
                organizationId: orgId
            },
            retries: 3
        });

        const TeamsSchema = z.object({
            teams: z.array(
                z.object({
                    id: z.number().int(),
                    name: z.string().optional(),
                    organizationId: z.number().int().optional()
                })
            )
        });
        const parsedTeams = TeamsSchema.safeParse(teamsResponse.data);
        if (!parsedTeams.success) {
            throw new Error(`Failed to parse teams: ${parsedTeams.error.message}`);
        }
        const teams = parsedTeams.data.teams;
        const team = teams.at(0);
        if (team === undefined) {
            throw new Error('No teams found');
        }
        const teamId = team.id;

        await nango.trackDeletesStart('Hook');

        // https://developers.make.com/api-documentation/
        const proxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/hooks',
            params: {
                teamId: teamId,
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

        // https://developers.make.com/api-documentation/
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

        await nango.trackDeletesEnd('Hook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
