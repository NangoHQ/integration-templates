import { z } from 'zod';
import { createAction } from 'nango';

const AttributeValueSchema = z.union([z.number(), z.string(), z.boolean()]);

const UpdateSchema = z.object({
    name: z.string().min(1).describe('Name of an attribute owned by this connection, for example "steps".'),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe('Local date of the value in YYYY-MM-DD format.'),
    value: AttributeValueSchema.describe('New total value for that date; must match the attribute value type. Booleans are stored as 1/0.')
});

const InputSchema = z
    .object({
        updates: z.array(UpdateSchema).min(1).max(35).describe('Between 1 and 35 daily value updates to write in a single request.')
    })
    .describe('Attribute value updates to write, sent as one batch.');

const ProviderSuccessSchema = z.object({
    name: z.string(),
    date: z.string(),
    value: AttributeValueSchema
});

const ProviderFailedSchema = z.object({
    name: z.string(),
    date: z.string().optional(),
    value: AttributeValueSchema.optional(),
    error_code: z.string(),
    error: z.string()
});

const ProviderResponseSchema = z.object({
    success: z.array(ProviderSuccessSchema),
    failed: z.array(ProviderFailedSchema)
});

const SuccessSchema = z.object({
    name: z.string().describe('Attribute name that was written.'),
    date: z.string().describe('Date the value was written for, in YYYY-MM-DD format.'),
    value: z.union([z.number(), z.string(), z.boolean()]).describe('Stored value as returned by the provider; booleans come back as 1/0.')
});

const FailedSchema = z.object({
    name: z.string().describe('Attribute name that could not be written.'),
    date: z.string().optional().describe('Date of the rejected update, when the provider echoes it back.'),
    value: z.union([z.number(), z.string(), z.boolean()]).optional().describe('Rejected value, when the provider echoes it back.'),
    error_code: z.string().describe('Machine-readable failure reason, for example "validation" or "missing_field".'),
    error: z.string().describe('Human-readable failure description.')
});

const OutputSchema = z
    .object({
        success: z.array(SuccessSchema).describe('Updates that were written successfully.'),
        failed: z.array(FailedSchema).describe('Updates the provider rejected; inspect this even when the request returns HTTP 200.')
    })
    .describe('Outcome of the batch, split into accepted and rejected updates.');

/**
 * @tags: [write]
 * @tagReason: Writes and overwrites daily values for attributes owned by this connection.
 * @pitfalls: Existing values for a date are overwritten with no history and cannot be reset to null; booleans are coerced to 1/0; partial failures still return HTTP 200/202 and appear in `failed`, and attributes not owned by this connection fail into `failed` too.
 */
const action = createAction({
    description: 'Write (overwrite) values for one or more owned attributes on specific dates.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.exist.io/reference/writing_data/#update-attribute-values
            endpoint: '/api/2/attributes/update/',
            data: input.updates,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            success: parsed.success.map((item) => ({
                name: item.name,
                date: item.date,
                value: item.value
            })),
            failed: parsed.failed.map((item) => ({
                name: item.name,
                ...(item.date !== undefined && { date: item.date }),
                ...(item.value !== undefined && { value: item.value }),
                error_code: item.error_code,
                error: item.error
            }))
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
