import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    sourceId: z.string().describe('Source ID. Example: "747a6dfa-389e-4d47-a840-308a12e4fd1c"')
});

const SourceTypeSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean()
});

const ProviderSourceSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean(),
    sourceType: SourceTypeSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    title: z.string(),
    isArchived: z.boolean(),
    sourceType: SourceTypeSchema.optional()
});

const ListResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(ProviderSourceSchema.passthrough()),
    moreDataAvailable: z.boolean(),
    nextCursor: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single source from Ashby',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hiringProcessMetadataRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Ashby does not expose a source.info endpoint, so we use source.list
        // and filter by ID across all pages.
        // https://developers.ashbyhq.com/reference/sourcelist
        let nextCursor: string | undefined;

        do {
            const response = await nango.post({
                endpoint: '/source.list',
                data: {
                    includeArchived: true,
                    ...(nextCursor && { cursor: nextCursor })
                },
                retries: 3
            });

            const listResponse = ListResponseSchema.parse(response.data);

            if (!listResponse.success) {
                throw new nango.ActionError({
                    type: 'provider_error',
                    message: 'Ashby API returned a non-success response for source.list'
                });
            }

            const source = listResponse.results.find((s) => s.id === input.sourceId);

            if (source) {
                const providerSource = ProviderSourceSchema.parse(source);
                return {
                    id: providerSource.id,
                    title: providerSource.title,
                    isArchived: providerSource.isArchived,
                    ...(providerSource.sourceType !== undefined && {
                        sourceType: providerSource.sourceType
                    })
                };
            }

            nextCursor = listResponse.nextCursor;
        } while (nextCursor);

        throw new nango.ActionError({
            type: 'not_found',
            message: 'Source not found',
            sourceId: input.sourceId
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
