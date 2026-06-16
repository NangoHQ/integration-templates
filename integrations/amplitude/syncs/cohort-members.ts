import { createSync } from 'nango';
import { z } from 'zod';

const CohortMemberSchema = z.object({
    id: z.string(),
    cohortId: z.string(),
    cohortName: z.string().optional(),
    amplitudeId: z.string().optional(),
    userId: z.string().optional(),
    lastMod: z.string().optional()
});

const CheckpointSchema = z.object({
    cohortsJson: z.string()
});

const CohortListItemSchema = z
    .object({
        id: z.string(),
        name: z.string().optional(),
        finished: z.boolean(),
        lastMod: z.union([z.number(), z.string()]).optional(),
        size: z.union([z.number(), z.null()]).optional()
    })
    .passthrough();

const CohortListResponseSchema = z
    .object({
        cohorts: z.array(CohortListItemSchema).optional()
    })
    .passthrough();

const CohortMemberResponseSchema = z
    .object({
        cohort: z
            .object({
                id: z.string(),
                name: z.string().optional(),
                lastMod: z.union([z.number(), z.string()]).optional()
            })
            .passthrough()
            .optional(),
        amplitude_ids: z.array(z.string()).optional(),
        user_ids: z.array(z.string()).optional()
    })
    .passthrough();

const sync = createSync({
    description: 'Sync cohort members.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    checkpoint: CheckpointSchema,
    models: {
        CohortMember: CohortMemberSchema
    },
    endpoints: [
        {
            method: 'POST',
            path: '/syncs/cohort-members'
        }
    ],

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = CheckpointSchema.parse(rawCheckpoint ?? { cohortsJson: '{}' });
        const lastSeen: Record<string, string> = JSON.parse(checkpoint.cohortsJson);

        // https://amplitude.com/docs/apis/analytics/behavioral-cohorts#get-all-cohorts
        const listResponse = await nango.get({
            endpoint: '/api/3/cohorts',
            retries: 3
        });

        const listValidation = CohortListResponseSchema.safeParse(listResponse.data);
        if (!listValidation.success) {
            throw new Error(`Failed to parse cohort list response: ${listValidation.error.message}`);
        }

        const cohorts = listValidation.data.cohorts ?? [];
        const currentCheckpoint: Record<string, string> = { ...lastSeen };

        for (const cohort of cohorts) {
            if (cohort.finished !== true) {
                continue;
            }

            const cohortLastMod = cohort.lastMod != null ? String(cohort.lastMod) : undefined;
            if (cohortLastMod !== undefined && lastSeen[cohort.id] === cohortLastMod) {
                continue;
            }

            // https://amplitude.com/docs/apis/analytics/behavioral-cohorts#get-one-cohort
            const memberResponse = await nango.get({
                endpoint: `/api/3/cohorts/${encodeURIComponent(cohort.id)}`,
                retries: 3
            });

            const memberValidation = CohortMemberResponseSchema.safeParse(memberResponse.data);
            if (!memberValidation.success) {
                throw new Error(`Failed to parse cohort member response for cohort ${cohort.id}: ${memberValidation.error.message}`);
            }

            const memberData = memberValidation.data;
            const amplitudeIds = memberData.amplitude_ids ?? [];
            const userIds = memberData.user_ids ?? [];
            const maxLength = Math.max(amplitudeIds.length, userIds.length);
            const members: Array<{ id: string; cohortId: string; cohortName?: string; amplitudeId?: string; userId?: string; lastMod?: string }> = [];

            for (let i = 0; i < maxLength; i++) {
                const amplitudeId = amplitudeIds[i];
                const userId = userIds[i];

                if (!amplitudeId && !userId) {
                    continue;
                }

                const id = amplitudeId ? `amplitude_id:${cohort.id}:${amplitudeId}` : `user_id:${cohort.id}:${userId}`;
                const record: { id: string; cohortId: string; cohortName?: string; amplitudeId?: string; userId?: string; lastMod?: string } = {
                    id,
                    cohortId: cohort.id,
                    ...(cohort.name !== undefined && { cohortName: cohort.name }),
                    ...(amplitudeId !== undefined && { amplitudeId }),
                    ...(userId !== undefined && { userId }),
                    ...(cohortLastMod !== undefined && { lastMod: cohortLastMod })
                };

                members.push(record);
            }

            if (members.length > 0) {
                await nango.batchSave(members, 'CohortMember');
            }

            if (cohortLastMod !== undefined) {
                currentCheckpoint[cohort.id] = cohortLastMod;
                await nango.saveCheckpoint({ cohortsJson: JSON.stringify(currentCheckpoint) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
