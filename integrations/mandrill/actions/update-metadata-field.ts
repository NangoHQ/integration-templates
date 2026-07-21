import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().min(1).describe('The unique identifier of the metadata field to update. Example: "customer_id"'),
    view_template: z.string().optional().describe('A Mustache template to control how the metadata is rendered in your activity log.')
});

const ErrorResponseSchema = z.object({
    status: z.literal('error'),
    name: z.string(),
    message: z.string().optional()
});

const ProviderMetadataSchema = z.object({
    name: z.string(),
    state: z.string(),
    view_template: z.string().nullable().optional()
});

const OutputSchema = z.object({
    name: z.string(),
    state: z.string(),
    view_template: z.string().optional()
});

const action = createAction({
    description: 'Update an existing custom metadata field definition.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://mailchimp.com/developer/transactional/api/metadata/update-metadata-field/
            endpoint: '1.0/metadata/update.json',
            data: {
                name: input.name,
                ...(input.view_template !== undefined && { view_template: input.view_template })
            },
            retries: 1
        });

        const data = response.data;

        const errorParse = ErrorResponseSchema.safeParse(data);
        if (errorParse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: errorParse.data.message || errorParse.data.name,
                name: errorParse.data.name
            });
        }

        const providerMetadata = ProviderMetadataSchema.parse(data);

        return {
            name: providerMetadata.name,
            state: providerMetadata.state,
            ...(providerMetadata.view_template != null && { view_template: providerMetadata.view_template })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
