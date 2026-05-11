import { createSync } from 'nango';
import { z } from 'zod';

// Raw provider schema matching Zendesk API response
const ProviderOrganizationSchema = z.object({
    id: z.number(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string(),
    external_id: z.string().nullable().optional(),
    domain_names: z.array(z.string()).optional(),
    group_id: z.number().nullable().optional(),
    shared_comments: z.boolean().optional(),
    shared_tickets: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    organization_fields: z.record(z.string(), z.any()).optional(),
    notes: z.string().nullable().optional(),
    details: z.string().nullable().optional(),
    deleted_at: z.string().nullable().optional()
});

// Normalized model for sync
const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    url: z.string(),
    external_id: z.string().optional(),
    domain_names: z.array(z.string()).optional(),
    group_id: z.number().optional(),
    shared_comments: z.boolean().optional(),
    shared_tickets: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
    notes: z.string().optional(),
    details: z.string().optional()
});

const CheckpointSchema = z.object({
    start_time: z.number()
});

// Response from Zendesk incremental export
const IncrementalExportResponseSchema = z.object({
    organizations: z.array(ProviderOrganizationSchema),
    end_time: z.number(),
    next_page: z.string().optional(),
    count: z.number().optional(),
    end_of_stream: z.boolean()
});

const sync = createSync({
    description: 'Sync organizations from Zendesk using incremental export',
    version: '1.0.0',
    frequency: 'every hour',
    endpoints: [
        {
            method: 'GET',
            path: '/syncs/organizations'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        Organization: OrganizationSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        // Use epoch 0 for initial sync if no checkpoint exists
        // Must be at least one minute in the past per Zendesk docs
        const oneMinuteAgo = Math.floor(Date.now() / 1000) - 60;
        const startTime = checkpoint?.start_time ?? 0;

        // Validate start_time is not too recent
        const safeStartTime = Math.min(startTime, oneMinuteAgo);

        // Use a manual loop for time-based pagination with end_time tracking
        let currentStartTime = safeStartTime;
        let hasMorePages = true;

        while (hasMorePages) {
            // https://developer.zendesk.com/api-reference/ticketing/ticket-management/incremental_exports/#incremental-organization-export
            const response = await nango.get({
                endpoint: '/api/v2/incremental/organizations',
                params: {
                    start_time: currentStartTime,
                    per_page: 1000
                },
                retries: 3
            });

            const parsed = IncrementalExportResponseSchema.safeParse(response.data);
            if (!parsed.success) {
                throw new Error(`Failed to parse incremental export response: ${parsed.error.message}`);
            }

            const { organizations, end_time, next_page, end_of_stream } = parsed.data;

            const mapped = organizations
                .filter((org) => org.deleted_at == null)
                .map((org) => ({
                    id: String(org.id),
                    name: org.name,
                    created_at: org.created_at,
                    updated_at: org.updated_at,
                    url: org.url,
                    ...(org.external_id != null && { external_id: org.external_id }),
                    ...(org.domain_names != null && { domain_names: org.domain_names }),
                    ...(org.group_id != null && { group_id: org.group_id }),
                    ...(org.shared_comments != null && { shared_comments: org.shared_comments }),
                    ...(org.shared_tickets != null && { shared_tickets: org.shared_tickets }),
                    ...(org.tags != null && { tags: org.tags }),
                    ...(org.notes != null && { notes: org.notes }),
                    ...(org.details != null && { details: org.details })
                }));

            const deletedOrganizations = organizations.filter((org) => org.deleted_at != null).map((org) => ({ id: String(org.id) }));

            if (mapped.length > 0) {
                await nango.batchSave(mapped, 'Organization');
            }

            if (deletedOrganizations.length > 0) {
                await nango.batchDelete(deletedOrganizations, 'Organization');
            }

            await nango.saveCheckpoint({
                start_time: end_time
            });

            // Check if we've reached the end of the stream
            // end_of_stream is true when all results up to current time have been returned
            if (end_of_stream) {
                hasMorePages = false;
            } else if (next_page) {
                // Extract start_time from next_page URL for the next iteration
                const url = new URL(next_page);
                const nextStartTime = url.searchParams.get('start_time');
                if (nextStartTime && parseInt(nextStartTime, 10) !== currentStartTime) {
                    currentStartTime = parseInt(nextStartTime, 10);
                } else {
                    // If nextStartTime is the same as current, we're done to avoid infinite loop
                    hasMorePages = false;
                }
            } else {
                hasMorePages = false;
            }
        }
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
