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

const TeamsResponseSchema = z.object({
    teams: z.array(TeamItemSchema),
    pg: z
        .object({
            offset: z.number(),
            limit: z.number()
        })
        .passthrough()
});

const CheckpointSchema = z.object({
    orgId: z.number(),
    teamOffset: z.number().min(0)
});

const sync = createSync({
    description: 'Sync teams across accessible organizations.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        Team: TeamSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();
        const parsedCheckpoint = CheckpointSchema.safeParse(checkpoint);
        const resumeOrgId = parsedCheckpoint.success ? parsedCheckpoint.data.orgId : undefined;
        const resumeTeamOffset = parsedCheckpoint.success ? parsedCheckpoint.data.teamOffset : undefined;

        const orgProxyConfig: ProxyConfiguration = {
            // https://developers.make.com/api-documentation/
            endpoint: '/organizations',
            paginate: {
                type: 'offset',
                offset_name_in_request: 'pg[offset]',
                offset_calculation_method: 'by-response-size',
                limit_name_in_request: 'pg[limit]',
                limit: 100,
                response_path: 'organizations'
            },
            retries: 3
        };

        const organizations: Array<z.infer<typeof OrganizationItemSchema>> = [];
        for await (const orgPage of nango.paginate<unknown>(orgProxyConfig)) {
            for (const rawOrg of orgPage) {
                const orgResult = OrganizationItemSchema.safeParse(rawOrg);
                if (!orgResult.success) {
                    throw new Error(`Invalid organization item: ${orgResult.error.message}`);
                }
                organizations.push(orgResult.data);
            }
        }

        const hasValidResumeOrg = resumeOrgId !== undefined && organizations.some((o) => o.id === resumeOrgId);
        const effectiveResumeOrgId = hasValidResumeOrg ? resumeOrgId : undefined;

        // Only open delete tracking once every organization has been enumerated and
        // validated, so a failed run never leaves tracking started without a matching
        // trackDeletesEnd.
        await nango.trackDeletesStart('Team');

        const limit = 100;
        let resumeOrgPending = effectiveResumeOrgId !== undefined;
        let resumeOffsetConsumed = false;

        for (const [i, org] of organizations.entries()) {
            if (resumeOrgPending) {
                if (org.id !== effectiveResumeOrgId) {
                    continue;
                }
                resumeOrgPending = false;
            }

            const offset = !resumeOffsetConsumed && hasValidResumeOrg && resumeTeamOffset !== undefined ? resumeTeamOffset : 0;
            resumeOffsetConsumed = true;
            let hasMore = true;
            let currentOffset = offset;

            while (hasMore) {
                const teamResponse = await nango.get({
                    // https://developers.make.com/api-documentation/
                    endpoint: '/teams',
                    params: {
                        organizationId: org.id,
                        'pg[limit]': limit,
                        'pg[offset]': currentOffset
                    },
                    retries: 3
                });

                const parsedResponse = TeamsResponseSchema.parse(teamResponse.data);
                const teams = [];
                for (const team of parsedResponse.teams) {
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

                if (teams.length < limit) {
                    hasMore = false;
                    const nextOrg = organizations[i + 1];
                    if (nextOrg) {
                        await nango.saveCheckpoint({ orgId: nextOrg.id, teamOffset: 0 });
                    }
                } else {
                    currentOffset += limit;
                    await nango.saveCheckpoint({ orgId: org.id, teamOffset: currentOffset });
                    hasMore = true;
                }
            }
        }

        await nango.clearCheckpoint();
        await nango.trackDeletesEnd('Team');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
