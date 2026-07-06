import { createSync } from 'nango';
import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const RawOpportunitySchema = z
    .object({
        id: z.string(),
        name: z.string().nullable().optional(),
        headline: z.string().nullable().optional(),
        contact: z.string().nullable().optional(),
        emails: z.array(z.string()).nullable().optional(),
        phones: z
            .array(z.object({ value: z.string().optional(), type: z.string().optional() }).passthrough())
            .nullable()
            .optional(),
        confidentiality: z.string().nullable().optional(),
        location: z.string().nullable().optional(),
        links: z.array(z.string()).nullable().optional(),
        archived: z
            .object({
                reason: z.string().nullable().optional(),
                archivedAt: z.number().nullable().optional()
            })
            .nullable()
            .optional(),
        createdAt: z.number().nullable().optional(),
        updatedAt: z.number().nullable().optional(),
        lastInteractionAt: z.number().nullable().optional(),
        lastAdvancedAt: z.number().nullable().optional(),
        snoozedUntil: z.number().nullable().optional(),
        archivedAt: z.number().nullable().optional(),
        archiveReason: z.string().nullable().optional(),
        stage: z.string().nullable().optional(),
        stageChanges: z.array(z.record(z.string(), z.unknown())).nullable().optional(),
        owner: z.string().nullable().optional(),
        tags: z.array(z.string()).nullable().optional(),
        sources: z.array(z.string()).nullable().optional(),
        origin: z.string().nullable().optional(),
        sourcedBy: z.string().nullable().optional(),
        applications: z.array(z.string()).nullable().optional(),
        resume: z.string().nullable().optional(),
        followers: z.array(z.string()).nullable().optional(),
        urls: z
            .object({
                list: z.string().nullable().optional(),
                show: z.string().nullable().optional()
            })
            .nullable()
            .optional(),
        dataProtection: z.record(z.string(), z.unknown()).nullable().optional(),
        isAnonymized: z.boolean().nullable().optional(),
        opportunityLocation: z.string().nullable().optional()
    })
    .passthrough();

const LeverOpportunitySchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    headline: z.string().optional(),
    contact: z.string().optional(),
    emails: z.array(z.string()).optional(),
    phones: z.array(z.object({ value: z.string().optional(), type: z.string().optional() }).passthrough()).optional(),
    confidentiality: z.string().optional(),
    location: z.string().optional(),
    links: z.array(z.string()).optional(),
    archived: z
        .object({
            reason: z.string().optional(),
            archivedAt: z.number().optional()
        })
        .optional(),
    createdAt: z.number().optional(),
    updatedAt: z.number().optional(),
    lastInteractionAt: z.number().optional(),
    lastAdvancedAt: z.number().optional(),
    snoozedUntil: z.number().optional(),
    archivedAt: z.number().optional(),
    archiveReason: z.string().optional(),
    stage: z.string().optional(),
    stageChanges: z.array(z.record(z.string(), z.unknown())).optional(),
    owner: z.string().optional(),
    tags: z.array(z.string()).optional(),
    sources: z.array(z.string()).optional(),
    origin: z.string().optional(),
    sourcedBy: z.string().optional(),
    applications: z.array(z.string()).optional(),
    resume: z.string().optional(),
    followers: z.array(z.string()).optional(),
    urls: z
        .object({
            list: z.string().optional(),
            show: z.string().optional()
        })
        .optional(),
    dataProtection: z.record(z.string(), z.unknown()).optional(),
    isAnonymized: z.boolean().optional(),
    opportunityLocation: z.string().optional()
});

const DeletedOpportunitySchema = z
    .object({
        id: z.string()
    })
    .passthrough();

const sync = createSync({
    description: 'Fetches all opportunities',
    version: '2.0.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    metadata: z.object({}),
    scopes: ['opportunities:read:admin'],
    models: {
        LeverOpportunity: LeverOpportunitySchema
    },

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-opportunities
            endpoint: '/v1/opportunities',
            ...(checkpointUpdatedAfter ? { params: { updated_at_start: checkpointUpdatedAfter.getTime() } } : {}),
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit_name_in_request: 'limit',
                response_path: 'data',
                limit: LIMIT
            },
            retries: 3
        };

        for await (const page of nango.paginate(config)) {
            const mappedOpportunities = page.map((opportunity) => mapOpportunity(opportunity));
            const batchSize = mappedOpportunities.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} opportunities (total opportunities: ${totalRecords})`);
            if (batchSize > 0) {
                await nango.batchSave(mappedOpportunities, 'LeverOpportunity');
            }
        }

        if (checkpointUpdatedAfter) {
            const deletedConfig: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-deleted-opportunities
                endpoint: '/v1/opportunities/deleted',
                params: {
                    deleted_at_start: checkpointUpdatedAfter.getTime()
                },
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'next',
                    cursor_name_in_request: 'offset',
                    limit_name_in_request: 'limit',
                    response_path: 'data',
                    limit: LIMIT
                },
                retries: 3
            };

            for await (const deletedPage of nango.paginate(deletedConfig)) {
                const deletions = deletedPage.map((item) => {
                    const parsed = DeletedOpportunitySchema.parse(item);
                    return { id: parsed.id };
                });
                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'LeverOpportunity');
                }
            }
        }

        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapOpportunity(opportunity: unknown) {
    const raw = RawOpportunitySchema.parse(opportunity);
    return {
        id: raw.id,
        ...(raw.name != null && { name: raw.name }),
        ...(raw.headline != null && { headline: raw.headline }),
        ...(raw.contact != null && { contact: raw.contact }),
        ...(raw.emails != null && { emails: raw.emails }),
        ...(raw.phones != null && { phones: raw.phones }),
        ...(raw.confidentiality != null && { confidentiality: raw.confidentiality }),
        ...(raw.location != null && { location: raw.location }),
        ...(raw.links != null && { links: raw.links }),
        ...(raw.archived != null && { archived: raw.archived }),
        ...(raw.createdAt != null && { createdAt: raw.createdAt }),
        ...(raw.updatedAt != null && { updatedAt: raw.updatedAt }),
        ...(raw.lastInteractionAt != null && { lastInteractionAt: raw.lastInteractionAt }),
        ...(raw.lastAdvancedAt != null && { lastAdvancedAt: raw.lastAdvancedAt }),
        ...(raw.snoozedUntil != null && { snoozedUntil: raw.snoozedUntil }),
        ...(raw.archivedAt != null && { archivedAt: raw.archivedAt }),
        ...(raw.archiveReason != null && { archiveReason: raw.archiveReason }),
        ...(raw.stage != null && { stage: raw.stage }),
        ...(raw.stageChanges != null && { stageChanges: raw.stageChanges }),
        ...(raw.owner != null && { owner: raw.owner }),
        ...(raw.tags != null && { tags: raw.tags }),
        ...(raw.sources != null && { sources: raw.sources }),
        ...(raw.origin != null && { origin: raw.origin }),
        ...(raw.sourcedBy != null && { sourcedBy: raw.sourcedBy }),
        ...(raw.applications != null && { applications: raw.applications }),
        ...(raw.resume != null && { resume: raw.resume }),
        ...(raw.followers != null && { followers: raw.followers }),
        ...(raw.urls != null && { urls: raw.urls }),
        ...(raw.dataProtection != null && { dataProtection: raw.dataProtection }),
        ...(raw.isAnonymized != null && { isAnonymized: raw.isAnonymized }),
        ...(raw.opportunityLocation != null && { opportunityLocation: raw.opportunityLocation })
    };
}
