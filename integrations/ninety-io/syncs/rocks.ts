import { createSync } from 'nango';
import { z } from 'zod';

const ProviderMilestoneSchema = z
    .object({
        _id: z.string(),
        title: z.string().optional().nullable(),
        dueDate: z.string().optional().nullable(),
        statusCode: z.string().optional().nullable(),
        createdByUserId: z.string().optional().nullable(),
        updatedBy: z.string().optional().nullable(),
        createdDate: z.string().optional().nullable(),
        updatedAt: z.string().optional().nullable()
    })
    .passthrough();

const ProviderRockSchema = z
    .object({
        _id: z.string(),
        title: z.string(),
        teamId: z.string(),
        dueDate: z.string().optional().nullable(),
        statusCode: z.string().optional().nullable(),
        levelCode: z.string().optional().nullable(),
        quarter: z.string().optional().nullable(),
        createdByUserId: z.string().optional().nullable(),
        updatedBy: z.string().optional().nullable(),
        createdDate: z.string().optional().nullable(),
        updatedAt: z.string().optional().nullable(),
        completed: z.boolean().optional().nullable(),
        archived: z.boolean().optional().nullable(),
        deleted: z.boolean().optional().nullable(),
        description: z.string().optional().nullable(),
        companyId: z.string().optional().nullable(),
        userId: z.string().optional().nullable(),
        completedDate: z.string().optional().nullable(),
        archivedDate: z.string().optional().nullable(),
        milestones: z.array(ProviderMilestoneSchema).optional().nullable()
    })
    .passthrough();

const ProviderRocksQueryResponseSchema = z.record(z.string(), z.array(z.unknown()));

const RockSchema = z.object({
    id: z.string(),
    title: z.string().optional(),
    teamId: z.string().optional(),
    dueDate: z.string().optional(),
    statusCode: z.string().optional(),
    levelCode: z.string().optional(),
    quarter: z.string().optional(),
    createdByUserId: z.string().optional(),
    updatedBy: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional(),
    completed: z.boolean().optional(),
    archived: z.boolean().optional(),
    deleted: z.boolean().optional(),
    description: z.string().optional(),
    companyId: z.string().optional(),
    userId: z.string().optional(),
    completedDate: z.string().optional(),
    archivedDate: z.string().optional()
});

const MilestoneSchema = z.object({
    id: z.string(),
    rockId: z.string(),
    title: z.string().optional(),
    dueDate: z.string().optional(),
    statusCode: z.string().optional(),
    createdByUserId: z.string().optional(),
    updatedBy: z.string().optional(),
    createdDate: z.string().optional(),
    updatedAt: z.string().optional()
});

const sync = createSync({
    description: 'Sync rocks (quarterly goals), including their nested milestones',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Rock: RockSchema,
        Milestone: MilestoneSchema
    },

    exec: async (nango) => {
        await nango.trackDeletesStart('Rock');
        await nango.trackDeletesStart('Milestone');

        const pageSize = 100;
        let pageIndex = 0;
        let hasMore = true;
        const seenRockIds = new Set<string>();
        const seenMilestoneIds = new Set<string>();

        while (hasMore) {
            // https://help.ninety.io/en/articles/15505694-api-reference-and-access
            const response = await nango.post({
                endpoint: '/v1/rocks/query',
                data: {
                    sortField: 'title',
                    sortDirection: 'asc',
                    pageSize,
                    pageIndex
                },
                retries: 3
            });

            const parsedResponse = ProviderRocksQueryResponseSchema.safeParse(response.data);
            if (!parsedResponse.success) {
                throw new Error(`Failed to parse rocks query response: ${parsedResponse.error.message}`);
            }

            const teamRocksMap = parsedResponse.data;
            const teamIds = Object.keys(teamRocksMap);
            const rocks = [];
            const milestones = [];

            for (const teamId of teamIds) {
                const teamRocks = teamRocksMap[teamId];
                if (!Array.isArray(teamRocks)) {
                    continue;
                }

                for (const rawRock of teamRocks) {
                    const parsedRock = ProviderRockSchema.safeParse(rawRock);
                    if (!parsedRock.success) {
                        throw new Error(`Failed to parse rock: ${parsedRock.error.message}`);
                    }

                    const rock = parsedRock.data;
                    if (!seenRockIds.has(rock._id)) {
                        seenRockIds.add(rock._id);
                        rocks.push({
                            id: rock._id,
                            ...(rock.title != null && { title: rock.title }),
                            ...(rock.teamId != null && { teamId: rock.teamId }),
                            ...(rock.dueDate != null && { dueDate: rock.dueDate }),
                            ...(rock.statusCode != null && { statusCode: rock.statusCode }),
                            ...(rock.levelCode != null && { levelCode: rock.levelCode }),
                            ...(rock.quarter != null && { quarter: rock.quarter }),
                            ...(rock.createdByUserId != null && { createdByUserId: rock.createdByUserId }),
                            ...(rock.updatedBy != null && { updatedBy: rock.updatedBy }),
                            ...(rock.createdDate != null && { createdDate: rock.createdDate }),
                            ...(rock.updatedAt != null && { updatedAt: rock.updatedAt }),
                            ...(rock.completed != null && { completed: rock.completed }),
                            ...(rock.archived != null && { archived: rock.archived }),
                            ...(rock.deleted != null && { deleted: rock.deleted }),
                            ...(rock.description != null && { description: rock.description }),
                            ...(rock.companyId != null && { companyId: rock.companyId }),
                            ...(rock.userId != null && { userId: rock.userId }),
                            ...(rock.completedDate != null && { completedDate: rock.completedDate }),
                            ...(rock.archivedDate != null && { archivedDate: rock.archivedDate })
                        });
                    }

                    const rawMilestones = rock.milestones ?? [];
                    for (const rawMilestone of rawMilestones) {
                        const parsedMilestone = ProviderMilestoneSchema.safeParse(rawMilestone);
                        if (!parsedMilestone.success) {
                            throw new Error(`Failed to parse milestone: ${parsedMilestone.error.message}`);
                        }

                        const milestone = parsedMilestone.data;
                        if (!seenMilestoneIds.has(milestone._id)) {
                            seenMilestoneIds.add(milestone._id);
                            milestones.push({
                                id: milestone._id,
                                rockId: rock._id,
                                ...(milestone.title != null && { title: milestone.title }),
                                ...(milestone.dueDate != null && { dueDate: milestone.dueDate }),
                                ...(milestone.statusCode != null && { statusCode: milestone.statusCode }),
                                ...(milestone.createdByUserId != null && { createdByUserId: milestone.createdByUserId }),
                                ...(milestone.updatedBy != null && { updatedBy: milestone.updatedBy }),
                                ...(milestone.createdDate != null && { createdDate: milestone.createdDate }),
                                ...(milestone.updatedAt != null && { updatedAt: milestone.updatedAt })
                            });
                        }
                    }
                }
            }

            if (rocks.length > 0) {
                await nango.batchSave(rocks, 'Rock');
            }

            if (milestones.length > 0) {
                await nango.batchSave(milestones, 'Milestone');
            }

            if (rocks.length === 0 && milestones.length === 0) {
                hasMore = false;
            } else {
                pageIndex = pageIndex + 1;
            }
        }

        await nango.trackDeletesEnd('Milestone');
        await nango.trackDeletesEnd('Rock');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
