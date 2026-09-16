import { z } from 'zod';
import { createAction } from 'nango';

const UserReferenceSchema = z
    .object({
        id: z.string().describe('The ID of the user who will be on-call during the override.'),
        type: z.string().describe('The type of the user object. Example: "user_reference".')
    })
    .describe('Reference to a PagerDuty user.');

const OverrideInputSchema = z
    .object({
        start: z.string().describe('The start date and time of the override in ISO 8601 format. Example: "2024-01-01T00:00:00Z".'),
        end: z.string().describe('The end date and time of the override in ISO 8601 format. Example: "2024-01-01T08:00:00Z".'),
        user: UserReferenceSchema.describe('The user to assign to the override.')
    })
    .describe('A single schedule override to create.');

const InputSchema = z
    .object({
        schedule_id: z.string().describe('The ID of the schedule to create overrides on.'),
        overrides: z.array(OverrideInputSchema).describe('An array of override objects to create.')
    })
    .describe('Input for creating one or more schedule overrides on a PagerDuty schedule.');

const ProviderOverrideSchema = z
    .object({
        id: z.string().optional().describe('The unique identifier of the created schedule override.')
    })
    .passthrough();

const OverrideResultSchema = z
    .object({
        status: z.number().describe('HTTP status code for this individual override creation.'),
        override: ProviderOverrideSchema.optional().describe('The created override object when the item succeeded.'),
        errors: z.array(z.string()).optional().describe('Human-readable error messages when the item failed.')
    })
    .describe('Result for an individual override creation within a batch request.');

const OutputSchema = z.array(OverrideResultSchema).describe('Array of per-item results from the batch override creation.');

/**
 * @tags: [write]
 * @tagReason: Creates new schedule overrides on the PagerDuty API.
 * @pitfalls: On partial batch failures the action throws an ActionError containing the mixed per-item results instead of returning them. Creating an override that overlaps an existing one silently gives the newest override priority.
 */
const action = createAction({
    description: 'Create one or more overrides on a schedule (temporarily replace who is on-call for a time window).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['schedules.write'],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developer.pagerduty.com/api-reference/36d6ebb690805-create-overrides-request
        const response = await nango.post({
            endpoint: `/schedules/${encodeURIComponent(input.schedule_id)}/overrides`,
            data: {
                overrides: input.overrides
            },
            retries: 3
        });

        const rawResults = z.array(z.unknown()).parse(response.data);
        const parsedResults: z.infer<typeof OutputSchema> = rawResults.map((item) => {
            return OverrideResultSchema.parse(item);
        });

        const failed = parsedResults.filter((r) => r.status < 200 || r.status >= 300);
        if (failed.length > 0) {
            throw new nango.ActionError({
                type: 'partial_failure',
                message: `${failed.length} of ${parsedResults.length} overrides failed to create.`,
                results: parsedResults
            });
        }

        return parsedResults;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
