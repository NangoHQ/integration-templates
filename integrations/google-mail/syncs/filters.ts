import { createSync } from 'nango';
import { z } from 'zod';

// Provider schemas matching Gmail API v1 users.settings.filters resource
// https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters

const FilterCriteriaSchema = z.object({
    from: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional(),
    query: z.string().optional(),
    negatedQuery: z.string().optional(),
    hasAttachment: z.boolean().optional(),
    excludeChats: z.boolean().optional(),
    size: z.number().int().optional(),
    sizeComparison: z.string().optional()
});

const FilterActionSchema = z.object({
    addLabelIds: z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
    forward: z.string().optional()
});

const ProviderFilterSchema = z.object({
    id: z.string(),
    criteria: FilterCriteriaSchema.optional(),
    action: FilterActionSchema.optional()
});

// Normalized model for sync
const FilterSchema = z.object({
    id: z.string(),
    from: z.string().optional(),
    to: z.string().optional(),
    subject: z.string().optional(),
    query: z.string().optional(),
    negatedQuery: z.string().optional(),
    hasAttachment: z.boolean().optional(),
    excludeChats: z.boolean().optional(),
    size: z.number().int().optional(),
    sizeComparison: z.string().optional(),
    addLabelIds: z.array(z.string()).optional(),
    removeLabelIds: z.array(z.string()).optional(),
    forward: z.string().optional()
});

const sync = createSync({
    description: 'Sync Gmail mailbox filters and their criteria or actions.',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    models: {
        Filter: FilterSchema
    },
    endpoints: [
        {
            path: '/syncs/filters',
            method: 'POST'
        }
    ],

    exec: async (nango) => {
        // Full refresh: track deletions since API returns complete filter list

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings.filters/list
        const proxyConfig = {
            endpoint: '/gmail/v1/users/me/settings/filters',
            retries: 3
        };

        const response = await nango.get(proxyConfig);

        const parsed = z
            .object({
                filter: z.array(z.unknown()).optional()
            })
            .safeParse(response.data);

        if (!parsed.success) {
            throw new Error('Invalid response from Gmail filters API: ' + parsed.error.message);
        }

        const filters = parsed.data.filter ?? [];

        const normalizedFilters = filters
            .map((raw) => {
                const parsedFilter = ProviderFilterSchema.safeParse(raw);
                if (!parsedFilter.success) {
                    return null;
                }
                const f = parsedFilter.data;
                return {
                    id: f.id,
                    ...(f.criteria?.from && { from: f.criteria.from }),
                    ...(f.criteria?.to && { to: f.criteria.to }),
                    ...(f.criteria?.subject && { subject: f.criteria.subject }),
                    ...(f.criteria?.query && { query: f.criteria.query }),
                    ...(f.criteria?.negatedQuery && { negatedQuery: f.criteria.negatedQuery }),
                    ...(f.criteria?.hasAttachment !== undefined && { hasAttachment: f.criteria.hasAttachment }),
                    ...(f.criteria?.excludeChats !== undefined && { excludeChats: f.criteria.excludeChats }),
                    ...(f.criteria?.size !== undefined && { size: f.criteria.size }),
                    ...(f.criteria?.sizeComparison && { sizeComparison: f.criteria.sizeComparison }),
                    ...(f.action?.addLabelIds !== undefined && { addLabelIds: f.action.addLabelIds }),
                    ...(f.action?.removeLabelIds !== undefined && { removeLabelIds: f.action.removeLabelIds }),
                    ...(f.action?.forward && { forward: f.action.forward })
                };
            })
            .filter((f): f is NonNullable<typeof f> => f !== null);

        await nango.trackDeletesStart('Filter');
        try {
            if (normalizedFilters.length > 0) {
                await nango.batchSave(normalizedFilters, 'Filter');
            }
        } finally {
            await nango.trackDeletesEnd('Filter');
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
