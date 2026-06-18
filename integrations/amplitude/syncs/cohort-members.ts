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

const CohortStateSchema = z.object({
    lastMod: z.string(),
    memberIds: z.array(z.string())
});

type CohortState = z.infer<typeof CohortStateSchema>;

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
    version: '1.0.1',
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
        const parsed = CheckpointSchema.safeParse(rawCheckpoint ?? { cohortsJson: '{}' });
        const checkpointData = parsed.success ? parsed.data : { cohortsJson: '{}' };

        // Parse stored cohort state; migrate old format (Record<string, string>) if present
        let lastSeen: Record<string, CohortState> = {};
        // @allowTryCatch JSON.parse can throw on malformed checkpoint data; fall back to empty state.
        try {
            const raw = JSON.parse(checkpointData.cohortsJson);
            for (const [k, v] of Object.entries(raw)) {
                if (typeof v === 'string') {
                    lastSeen[k] = { lastMod: v, memberIds: [] };
                } else {
                    const stateResult = CohortStateSchema.safeParse(v);
                    if (stateResult.success) {
                        lastSeen[k] = stateResult.data;
                    }
                }
            }
        } catch {
            lastSeen = {};
        }

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
        const currentCheckpoint: Record<string, CohortState> = { ...lastSeen };

        for (const cohort of cohorts) {
            if (cohort.finished !== true) {
                continue;
            }

            const cohortLastMod = cohort.lastMod != null ? String(cohort.lastMod) : undefined;
            if (cohortLastMod !== undefined && lastSeen[cohort.id]?.lastMod === cohortLastMod) {
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
            const newMemberIds: string[] = [];

            for (let i = 0; i < maxLength; i++) {
                const amplitudeId = amplitudeIds[i];
                const userId = userIds[i];

                if (!amplitudeId && !userId) {
                    continue;
                }

                const id = amplitudeId ? `amplitude_id:${cohort.id}:${amplitudeId}` : `user_id:${cohort.id}:${userId}`;
                newMemberIds.push(id);
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

            // Delete members that were in the previous run but are no longer present
            const prevMemberIds = lastSeen[cohort.id]?.memberIds ?? [];
            const newMemberIdSet = new Set(newMemberIds);
            const removedIds = prevMemberIds.filter((id) => !newMemberIdSet.has(id));
            if (removedIds.length > 0) {
                await nango.batchDelete(
                    removedIds.map((id) => ({ id })),
                    'CohortMember'
                );
            }

            if (members.length > 0) {
                await nango.batchSave(members, 'CohortMember');
            }

            if (cohortLastMod !== undefined) {
                currentCheckpoint[cohort.id] = { lastMod: cohortLastMod, memberIds: newMemberIds };
                await nango.saveCheckpoint({ cohortsJson: JSON.stringify(currentCheckpoint) });
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
