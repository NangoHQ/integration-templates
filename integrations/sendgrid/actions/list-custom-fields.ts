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

const OutputSchema = z.object({
    custom_fields: z.array(CustomFieldSchema),
    reserved_fields: z.array(ReservedFieldSchema)
});

function isNonNullObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object';
}

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

        const data = response.data;
        if (!isNonNullObject(data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from SendGrid API'
            });
        }

        const rawCustomFields = Array.isArray(data['custom_fields']) ? data['custom_fields'] : [];
        const rawReservedFields = Array.isArray(data['reserved_fields']) ? data['reserved_fields'] : [];

        const customFields = rawCustomFields.map((field: unknown) => {
            if (!isNonNullObject(field)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid custom field in response'
                });
            }
            return {
                id: String(field['id'] ?? ''),
                name: String(field['name'] ?? ''),
                field_type: String(field['field_type'] ?? ''),
                ...(field['created_at'] !== undefined && { created_at: String(field['created_at']) }),
                ...(field['updated_at'] !== undefined && { updated_at: String(field['updated_at']) })
            };
        });

        const reservedFields = rawReservedFields.map((field: unknown) => {
            if (!isNonNullObject(field)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Invalid reserved field in response'
                });
            }
            return {
                id: String(field['id'] ?? ''),
                name: String(field['name'] ?? ''),
                field_type: String(field['field_type'] ?? '')
            };
        });

        return {
            custom_fields: customFields,
            reserved_fields: reservedFields
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
