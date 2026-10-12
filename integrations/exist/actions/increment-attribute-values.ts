import { z } from 'zod';
import { createAction } from 'nango';

const IncrementSchema = z.object({
    name: z.string().describe('Name of the owned numeric attribute to increment. Example: "steps"'),
    value: z.number().describe('Delta to add to the attribute value for the date (may be negative). Example: 3'),
    date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .describe('Date to apply the delta to in YYYY-MM-DD format. Defaults to the user\'s today when omitted. Example: "2022-05-20"')
});

const InputSchema = z
    .object({
        increments: z.array(IncrementSchema).min(1).max(35).describe('Up to 35 attribute increments to apply in a single request.')
    })
    .describe("Attribute increments to apply to the authenticated user's owned numeric attributes.");

const SuccessSchema = z.object({
    name: z.string().describe('Name of the attribute that was incremented.'),
    value: z.number().describe('Delta that was applied to the attribute.'),
    date: z.string().optional().describe('Date the delta was applied to, in YYYY-MM-DD format.'),
    current: z.number().describe('New running total for the attribute on that date.')
});

const FailedSchema = z.object({
    name: z.string().describe('Name of the attribute that could not be incremented.'),
    value: z.number().optional().describe('Delta that was rejected.'),
    date: z.string().optional().describe('Date the delta was intended for, in YYYY-MM-DD format.'),
    error_code: z.string().describe('Machine-readable error code for the failure. Example: "validation"'),
    error: z.string().describe('Human-readable explanation of the failure.')
});

const OutputSchema = z
    .object({
        success: z.array(SuccessSchema).describe('Attribute increments that were applied successfully.'),
        failed: z.array(FailedSchema).describe('Attribute increments that were rejected; each entry includes an error code and message.')
    })
    .describe('Results of the requested attribute increments, split into applied and rejected entries.');

/**
 * @tags: [write]
 * @tagReason: Adds a delta to an owned attribute's value for a date, mutating the user's tracked data.
 * @pitfalls: Only Integer/Float attributes can be incremented and the attribute must already be owned by the connection, so String, scale, and time-of-day attributes fail; rejected entries are returned in `failed` with `error_code`/`error` rather than throwing, and omitting `date` applies the delta to the user's today.
 */
const action = createAction({
    description: "Add to (rather than overwrite) an owned numeric attribute's value for a given date, creating the day's entry if needed.",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.exist.io/reference/writing_data/#increment-attribute-values
        const response = await nango.post({
            endpoint: '/api/2/attributes/increment/',
            data: input.increments.map((increment) => ({
                name: increment.name,
                value: increment.value,
                ...(increment.date !== undefined && { date: increment.date })
            })),
            // Non-idempotent write: retrying after a lost response would apply the delta twice.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
