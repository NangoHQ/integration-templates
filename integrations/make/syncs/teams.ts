import { createSync, ProxyConfiguration } from 'nango';
import { z } from 'zod';

const TeamSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    organizationId: z.string(),
    operationsLimit: z.number().optional(),
    transferLimit: z.string().optional(),
    consumedOperations: z.number().optional(),
    consumedTransfer: z.string().optional(),
    isPaused: z.boolean().optional(),
    consumedCenticredits: z.number().optional()
});

const OrganizationItemSchema = z.object({
    id: z.number()
});

const TeamItemSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    organizationId: z.number().optional(),
    operationsLimit: z.number().optional(),
    transferLimit: z.union([z.string(), z.number()]).optional(),
    consumedOperations: z.number().optional(),
    consumedTransfer: z.union([z.string(), z.number()]).optional(),
    isPaused: z.boolean().optional(),
    consumedCenticredits: z.number().optional()
});

const sync = createSync({
    description: 'Sync teams across accessible organizations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Team');

        const orgProxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/organizations',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_calculation_method: 'per-page',
                limit_name_in_request: 'pg[limit]',
                limit: 100,
                response_path: 'organizations'
            },
            retries: 3
        };

        for await (const orgPage of nango.paginate<unknown>(orgProxyConfig)) {
            for (const rawOrg of orgPage) {
                const orgResult = OrganizationItemSchema.safeParse(rawOrg);
                if (!orgResult.success) {
                    throw new Error(`Invalid organization item: ${orgResult.error.message}`);
                }
                const org = orgResult.data;

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
                        limit: 100,
                        response_path: 'teams'
                    },
                    retries: 3
                };

                for await (const teamPage of nango.paginate<unknown>(teamProxyConfig)) {
                    const teams = [];
                    for (const rawTeam of teamPage) {
                        const teamResult = TeamItemSchema.safeParse(rawTeam);
                        if (!teamResult.success) {
                            throw new Error(`Invalid team item: ${teamResult.error.message}`);
                        }
                        const team = teamResult.data;

                        teams.push({
                            id: String(team.id),
                            name: team.name,
                            organizationId: String(org.id),
                            operationsLimit: team.operationsLimit,
                            transferLimit: team.transferLimit !== undefined ? String(team.transferLimit) : undefined,
                            consumedOperations: team.consumedOperations,
                            consumedTransfer: team.consumedTransfer !== undefined ? String(team.consumedTransfer) : undefined,
                            isPaused: team.isPaused,
                            consumedCenticredits: team.consumedCenticredits
                        });
                    }

                    if (teams.length > 0) {
                        await nango.batchSave(teams, 'Team');
                    }
                }
            }
        }

        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
