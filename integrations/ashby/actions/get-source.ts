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
    results: z.array(ProviderSourceSchema.passthrough()),
    moreDataAvailable: z.boolean()
});

const action = createAction({
    description: 'Retrieve a single source from Ashby',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/get-source',
        group: 'Sources'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['hiringProcessMetadataRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Ashby does not expose a source.info endpoint, so we use source.list
        // and filter by ID.
        // https://developers.ashbyhq.com/reference/sourcelist
        const response = await nango.post({
            endpoint: '/source.list',
            data: {
                includeArchived: true
            },
            retries: 3
        });

        const listResponse = ListResponseSchema.parse(response.data);
        const source = listResponse.results.find((s) => s.id === input.sourceId);

        if (!source) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Source not found',
                sourceId: input.sourceId
            });
        }

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
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
