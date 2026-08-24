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

const CheckpointSchema = z.object({
    teamId: z.number().int(),
    offset: z.number().int()
});

const sync = createSync({
    description: 'Sync webhooks/mailhooks for a team',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Hook: HookSchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpointResult = CheckpointSchema.safeParse(rawCheckpoint ?? { teamId: -1, offset: 0 });
        if (!checkpointResult.success) {
            throw new Error(`Invalid checkpoint: ${checkpointResult.error.message}`);
        }
        const checkpoint = checkpointResult.data;

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
                offset_calculation_method: 'by-response-size',
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
                        offset_calculation_method: 'by-response-size',
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

        if (checkpoint.teamId !== -1 && !teams.some((t) => t.id === checkpoint.teamId)) {
            throw new Error(`Checkpoint references team ${checkpoint.teamId} which no longer exists`);
        }

        await nango.trackDeletesStart('Hook');

        let started = checkpoint.teamId === -1;

        for (const team of teams) {
            if (!started) {
                if (team.id === checkpoint.teamId) {
                    started = true;
                } else {
                    continue;
                }
            }

            const startOffset = team.id === checkpoint.teamId ? checkpoint.offset : 0;
            let nextOffset = startOffset;

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
                    offset_start_value: startOffset,
                    offset_calculation_method: 'by-response-size',
                    limit_name_in_request: 'pg[limit]',
                    limit: 50,
                    response_path: 'hooks',
                    on_page: async ({ nextPageParam }) => {
                        nextOffset = typeof nextPageParam === 'number' ? nextPageParam : nextOffset;
                    }
                },
                retries: 3
            };

            for await (const page of nango.paginate<unknown>(proxyConfig)) {
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

                await nango.saveCheckpoint({ teamId: team.id, offset: nextOffset });
            }

            const currentTeamIndex = teams.findIndex((t) => t.id === team.id);
            if (currentTeamIndex === -1) {
                throw new Error(`Team ${team.id} not found in discovered teams`);
            }
            const nextTeamIndex = currentTeamIndex + 1;
            const nextTeam = teams[nextTeamIndex];
            if (nextTeam) {
                await nango.saveCheckpoint({ teamId: nextTeam.id, offset: 0 });
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Hook');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
