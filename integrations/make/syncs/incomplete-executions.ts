import { createSync } from 'nango';
import { z } from 'zod';

const MetadataSchema = z.object({
    teamId: z.union([z.string(), z.number()]).optional()
});

const OrganizationSchema = z.object({
    id: z.number().int(),
    name: z.string().optional()
});

const TeamSchema = z.object({
    id: z.number().int(),
    name: z.string().optional()
});

const ScenarioSchema = z.object({
    id: z.number().int(),
    name: z.string().optional(),
    teamId: z.number().int().optional(),
    isActive: z.boolean().optional()
});

const DlqSchema = z.object({
    id: z.string(),
    reason: z.string().optional(),
    created: z.string().optional(),
    size: z.number().int().optional(),
    resolved: z.boolean().optional(),
    retry: z.boolean().optional(),
    attempts: z.number().int().optional()
});

const IncompleteExecutionSchema = z.object({
    id: z.string(),
    scenarioId: z.number().int(),
    reason: z.string().optional(),
    created: z.string().optional(),
    size: z.number().int().optional(),
    resolved: z.boolean().optional(),
    retry: z.boolean().optional(),
    attempts: z.number().int().optional()
});

const sync = createSync({
    description: 'Sync incomplete/failed executions (dead-letter queue) for each scenario in a team.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    metadata: MetadataSchema,
    models: {
        IncompleteExecution: IncompleteExecutionSchema
    },

    exec: async (nango) => {
        const metadata = await nango.getMetadata();
        const parsedMetadata = MetadataSchema.safeParse(metadata);
        let teamId: number | undefined;

        if (parsedMetadata.success && parsedMetadata.data.teamId) {
            teamId = Number(parsedMetadata.data.teamId);
        }

        if (teamId === undefined) {
            const organizations = [];

            // https://developers.make.com/api-documentation/api-reference/organizations
            for await (const page of nango.paginate({
                endpoint: '/organizations',
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'pg[offset]',
                    offset_start_value: 0,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'pg[limit]',
                    limit: 50,
                    response_path: 'organizations'
                },
                retries: 3
            })) {
                for (const rawOrg of page) {
                    const org = OrganizationSchema.parse(rawOrg);
                    organizations.push(org);
                }
            }

            const firstOrg = organizations[0];
            if (!firstOrg) {
                throw new Error('No organizations found for this connection');
            }

            const orgId = firstOrg.id;

            // https://developers.make.com/api-documentation/api-reference/teams
            const teamResponse = await nango.get({
                endpoint: '/teams',
                params: {
                    organizationId: String(orgId)
                },
                retries: 3
            });

            const parsedTeams = z.array(TeamSchema).parse(teamResponse.data.teams);

            const firstTeam = parsedTeams[0];
            if (!firstTeam) {
                throw new Error('No teams found for this connection');
            }

            teamId = firstTeam.id;
        }

        const scenarios = [];

        // https://developers.make.com/api-documentation/api-reference/scenarios
        for await (const page of nango.paginate({
            endpoint: '/scenarios',
            params: {
                teamId: String(teamId)
            },
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_start_value: 0,
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pg[limit]',
                limit: 50,
                response_path: 'scenarios'
            },
            retries: 3
        })) {
            for (const rawScenario of page) {
                const scenario = ScenarioSchema.parse(rawScenario);
                scenarios.push(scenario);
            }
        }

        await nango.trackDeletesStart('IncompleteExecution');

        for (const scenario of scenarios) {
            // https://developers.make.com/api-documentation/api-reference/incomplete-executions
            for await (const page of nango.paginate({
                endpoint: '/dlqs',
                params: {
                    scenarioId: String(scenario.id)
                },
                paginate: {
                    type: 'offset',
                    offset_name_in_request: 'pg[offset]',
                    offset_start_value: 0,
                    offset_calculation_method: 'per-page',
                    limit_name_in_request: 'pg[limit]',
                    limit: 50,
                    response_path: 'dlqs'
                },
                retries: 3
            })) {
                const dlqs = [];
                for (const rawDlq of page) {
                    const dlq = DlqSchema.parse(rawDlq);
                    dlqs.push({
                        id: dlq.id,
                        scenarioId: scenario.id,
                        reason: dlq.reason,
                        created: dlq.created,
                        size: dlq.size,
                        resolved: dlq.resolved,
                        retry: dlq.retry,
                        attempts: dlq.attempts
                    });
                }

                if (dlqs.length > 0) {
                    await nango.batchSave(dlqs, 'IncompleteExecution');
                }
            }
        }

        await nango.trackDeletesEnd('IncompleteExecution');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
