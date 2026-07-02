import { createSync, type ProxyConfiguration } from 'nango';
import { z } from 'zod';

const LIMIT = 100;

const LeverPostingSchema = z.object({
    id: z.string(),
    text: z.string().nullish(),
    createdAt: z.number().nullish(),
    updatedAt: z.number().nullish(),
    user: z.string().nullish(),
    owner: z.string().nullish(),
    hiringManager: z.string().nullish(),
    confidentiality: z.string().nullish(),
    categories: z
        .object({
            team: z.string().nullish(),
            department: z.string().nullish(),
            location: z.string().nullish(),
            allLocations: z.string().array().nullish(),
            commitment: z.string().nullish(),
            level: z.string().nullish()
        })
        .passthrough()
        .nullish(),
    content: z
        .object({
            description: z.string().nullish(),
            descriptionHtml: z.string().nullish(),
            lists: z
                .array(
                    z
                        .object({
                            text: z.string().nullish(),
                            content: z.string().nullish()
                        })
                        .passthrough()
                )
                .nullish(),
            closing: z.string().nullish(),
            closingHtml: z.string().nullish()
        })
        .passthrough()
        .nullish(),
    country: z.string().nullish(),
    followers: z.string().array().nullish(),
    tags: z.string().array().nullish(),
    state: z.string().nullish(),
    distributionChannels: z.string().array().nullish(),
    reqCode: z.string().nullish(),
    requisitionCodes: z.string().array().nullish(),
    salaryDescription: z.string().nullish(),
    salaryDescriptionHtml: z.string().nullish(),
    salaryRange: z
        .object({
            max: z.number().nullish(),
            min: z.number().nullish(),
            currency: z.string().nullish(),
            interval: z.string().nullish()
        })
        .passthrough()
        .nullish(),
    urls: z
        .object({
            list: z.string().nullish(),
            show: z.string().nullish(),
            apply: z.string().nullish()
        })
        .passthrough()
        .nullish(),
    workplaceType: z.string().nullish()
});

const DeletedPostingSchema = z.object({
    id: z.string(),
    deletedAt: z.number().nullish()
});

const CheckpointSchema = z.object({
    updated_after: z.string()
});

const sync = createSync({
    description: 'Fetches a list of all postings in Lever',
    version: '2.1.0',
    frequency: 'every 6 hours',
    autoStart: true,
    checkpoint: CheckpointSchema,
    scopes: ['postings:read:admin'],
    models: {
        LeverPosting: LeverPostingSchema
    },
    metadata: z.object({}),

    exec: async (nango) => {
        const rawCheckpoint = await nango.getCheckpoint();
        const checkpoint = rawCheckpoint ? CheckpointSchema.parse(rawCheckpoint) : undefined;
        const checkpointUpdatedAfter = checkpoint?.updated_after ? new Date(checkpoint.updated_after) : undefined;
        const runStartedAt = new Date().toISOString();

        let totalRecords = 0;

        const config: ProxyConfiguration = {
            // https://hire.lever.co/developer/documentation#list-all-postings
            endpoint: '/v1/postings',
            params: {
                confidentiality: 'non-confidential',
                ...(checkpointUpdatedAfter ? { updated_at_start: checkpointUpdatedAfter.getTime() } : {})
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

        for await (const posting of nango.paginate(config)) {
            const mappedPosting = posting.map(mapPosting);

            const batchSize = mappedPosting.length;
            totalRecords += batchSize;
            await nango.log(`Saving batch of ${batchSize} posting(s) (total posting(s): ${totalRecords})`);
            await nango.batchSave(mappedPosting, 'LeverPosting');
        }

        if (checkpointUpdatedAfter) {
            const deletedConfig: ProxyConfiguration = {
                // https://hire.lever.co/developer/documentation#list-deleted-postings
                endpoint: '/v1/postings/deleted',
                params: {
                    deleted_at_start: checkpointUpdatedAfter.getTime(),
                    deleted_at_end: Date.now() + 60000
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

            for await (const deletedBatch of nango.paginate(deletedConfig)) {
                const parsed = DeletedPostingSchema.array().parse(deletedBatch);
                const deletions = parsed.map((record) => ({ id: record.id }));
                if (deletions.length > 0) {
                    await nango.batchDelete(deletions, 'LeverPosting');
                }
            }
        }

        await nango.saveCheckpoint({ updated_after: runStartedAt });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;

function mapPosting(posting: unknown) {
    const parsed = LeverPostingSchema.parse(posting);
    return {
        id: parsed.id,
        ...(parsed.text != null && { text: parsed.text }),
        ...(parsed.createdAt != null && { createdAt: parsed.createdAt }),
        ...(parsed.updatedAt != null && { updatedAt: parsed.updatedAt }),
        ...(parsed.user != null && { user: parsed.user }),
        ...(parsed.owner != null && { owner: parsed.owner }),
        ...(parsed.hiringManager != null && { hiringManager: parsed.hiringManager }),
        ...(parsed.confidentiality != null && { confidentiality: parsed.confidentiality }),
        ...(parsed.categories != null && { categories: parsed.categories }),
        ...(parsed.content != null && { content: parsed.content }),
        ...(parsed.country != null && { country: parsed.country }),
        ...(parsed.followers != null && { followers: parsed.followers }),
        ...(parsed.tags != null && { tags: parsed.tags }),
        ...(parsed.state != null && { state: parsed.state }),
        ...(parsed.distributionChannels != null && { distributionChannels: parsed.distributionChannels }),
        ...(parsed.reqCode != null && { reqCode: parsed.reqCode }),
        ...(parsed.requisitionCodes != null && { requisitionCodes: parsed.requisitionCodes }),
        ...(parsed.salaryDescription != null && { salaryDescription: parsed.salaryDescription }),
        ...(parsed.salaryDescriptionHtml != null && { salaryDescriptionHtml: parsed.salaryDescriptionHtml }),
        ...(parsed.salaryRange != null && { salaryRange: parsed.salaryRange }),
        ...(parsed.urls != null && { urls: parsed.urls }),
        ...(parsed.workplaceType != null && { workplaceType: parsed.workplaceType })
    };
}
