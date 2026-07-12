import { createSync } from 'nango';
import { z } from 'zod';

const ProviderMilestoneSchema = z.object({
    id: z.number().int(),
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().nullable().optional(),
    completed_at_override: z.string().nullable().optional(),
    created_at: z.string(),
    description: z.string().nullable().optional(),
    entity_type: z.string().optional(),
    key_result_ids: z.array(z.string()).optional(),
    name: z.string(),
    position: z.number().int().optional(),
    started: z.boolean().optional(),
    started_at: z.string().nullable().optional(),
    started_at_override: z.string().nullable().optional(),
    state: z.string().optional(),
    stats: z
        .object({
            average_cycle_time: z.number().optional(),
            average_lead_time: z.number().optional(),
            num_related_documents: z.number().optional()
        })
        .optional(),
    updated_at: z.string()
});

const MilestoneSchema = z.object({
    id: z.string(),
    app_url: z.string().optional(),
    archived: z.boolean().optional(),
    completed: z.boolean().optional(),
    completed_at: z.string().optional(),
    completed_at_override: z.string().optional(),
    created_at: z.string(),
    description: z.string().optional(),
    entity_type: z.string().optional(),
    key_result_ids: z.array(z.string()).optional(),
    name: z.string(),
    position: z.number().int().optional(),
    started: z.boolean().optional(),
    started_at: z.string().optional(),
    started_at_override: z.string().optional(),
    state: z.string().optional(),
    stats: z
        .object({
            average_cycle_time: z.number().optional(),
            average_lead_time: z.number().optional(),
            num_related_documents: z.number().optional()
        })
        .optional(),
    updated_at: z.string()
});

const sync = createSync({
    description: 'Sync Objectives (API resource name is milestone).',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Milestone: MilestoneSchema
    },

    exec: async (nango) => {
        // Blocker: GET /api/v3/milestones returns a flat, unpaginated array with no
        // timestamp filter, cursor, page token, or offset support.
        // https://developer.shortcut.com/api/rest/v3#List-Milestones
        const response = await nango.get({
            endpoint: '/api/v3/milestones',
            retries: 3
        });

        const parseResult = z.array(ProviderMilestoneSchema).safeParse(response.data);
        if (!parseResult.success) {
            throw new Error(`Failed to parse milestones: ${parseResult.error.message}`);
        }

        await nango.trackDeletesStart('Milestone');

        const milestones = parseResult.data.map((milestone) => {
            const mapped: {
                id: string;
                app_url?: string;
                archived?: boolean;
                completed?: boolean;
                completed_at?: string;
                completed_at_override?: string;
                created_at: string;
                description?: string;
                entity_type?: string;
                key_result_ids?: string[];
                name: string;
                position?: number;
                started?: boolean;
                started_at?: string;
                started_at_override?: string;
                state?: string;
                stats?: { average_cycle_time?: number; average_lead_time?: number; num_related_documents?: number };
                updated_at: string;
            } = {
                id: String(milestone.id),
                created_at: milestone.created_at,
                name: milestone.name,
                updated_at: milestone.updated_at
            };

            if (milestone.app_url !== undefined) {
                mapped.app_url = milestone.app_url;
            }
            if (milestone.archived !== undefined) {
                mapped.archived = milestone.archived;
            }
            if (milestone.completed !== undefined) {
                mapped.completed = milestone.completed;
            }
            if (milestone.completed_at !== undefined && milestone.completed_at !== null) {
                mapped.completed_at = milestone.completed_at;
            }
            if (milestone.completed_at_override !== undefined && milestone.completed_at_override !== null) {
                mapped.completed_at_override = milestone.completed_at_override;
            }
            if (milestone.description !== undefined && milestone.description !== null) {
                mapped.description = milestone.description;
            }
            if (milestone.entity_type !== undefined) {
                mapped.entity_type = milestone.entity_type;
            }
            if (milestone.key_result_ids !== undefined) {
                mapped.key_result_ids = milestone.key_result_ids;
            }
            if (milestone.position !== undefined) {
                mapped.position = milestone.position;
            }
            if (milestone.started !== undefined) {
                mapped.started = milestone.started;
            }
            if (milestone.started_at !== undefined && milestone.started_at !== null) {
                mapped.started_at = milestone.started_at;
            }
            if (milestone.started_at_override !== undefined && milestone.started_at_override !== null) {
                mapped.started_at_override = milestone.started_at_override;
            }
            if (milestone.state !== undefined) {
                mapped.state = milestone.state;
            }
            if (milestone.stats !== undefined) {
                mapped.stats = {};
                if (milestone.stats.average_cycle_time !== undefined) {
                    mapped.stats.average_cycle_time = milestone.stats.average_cycle_time;
                }
                if (milestone.stats.average_lead_time !== undefined) {
                    mapped.stats.average_lead_time = milestone.stats.average_lead_time;
                }
                if (milestone.stats.num_related_documents !== undefined) {
                    mapped.stats.num_related_documents = milestone.stats.num_related_documents;
                }
            }

            return mapped;
        });

        if (milestones.length > 0) {
            await nango.batchSave(milestones, 'Milestone');
        }

        await nango.trackDeletesEnd('Milestone');
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
