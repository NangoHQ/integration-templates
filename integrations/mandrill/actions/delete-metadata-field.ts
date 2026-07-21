import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).max(64).describe('The unique identifier of the metadata field to delete. Example: "group_id"')
});

const ProviderMetadataSchema = z.object({
    name: z.string(),
    state: z.enum(['active', 'delete', 'index', 'failed']),
    view_template: z.string().nullable().optional()
});

const OutputSchema = z.object({
    name: z.string(),
    state: z.enum(['active', 'delete', 'index', 'failed']),
    view_template: z.string().optional()
});

const action = createAction({
    description: 'Delete an existing custom metadata field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/metadata/delete-metadata-field/
            endpoint: '1.0/metadata/delete.json',
            data: {
                name: input.name
            },
            retries: 3
        });

        const providerMetadata = ProviderMetadataSchema.parse(response.data);

        return {
            name: providerMetadata.name,
            state: providerMetadata.state,
            ...(providerMetadata.view_template != null && { view_template: providerMetadata.view_template })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
