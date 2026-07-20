import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const CustomFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    field_type: z.string(),
    created_at: z.string().optional(),
    updated_at: z.string().optional()
});

const ReservedFieldSchema = z.object({
    id: z.string(),
    name: z.string(),
    field_type: z.string()
});

const ProviderResponseSchema = z.object({
    custom_fields: z.array(CustomFieldSchema).optional(),
    reserved_fields: z.array(ReservedFieldSchema).optional()
});

const OutputSchema = z.object({
    custom_fields: z.array(CustomFieldSchema),
    reserved_fields: z.array(ReservedFieldSchema)
});

const action = createAction({
    description: 'List custom contact field definitions.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://www.twilio.com/docs/sendgrid/api-reference/custom-fields/list-all-custom-fields
        const response = await nango.get({
            endpoint: '/v3/marketing/field_definitions',
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            custom_fields: providerResponse.custom_fields ?? [],
            reserved_fields: providerResponse.reserved_fields ?? []
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
