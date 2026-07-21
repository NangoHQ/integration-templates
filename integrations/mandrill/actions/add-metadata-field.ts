import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).max(64).describe('Unique identifier for the metadata field. Example: "group_id"'),
    view_template: z.string().max(1024).optional().describe('Optional Mustache template to control how the metadata is rendered in your activity log.')
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
    description: 'Add a new custom metadata field definition for the account.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/metadata/add-metadata-field
            endpoint: '/metadata/add',
            baseUrlOverride: 'https://mandrillapp.com/api/1.0',
            data: {
                name: input.name,
                ...(input.view_template !== undefined && { view_template: input.view_template })
            },
            retries: 1
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
