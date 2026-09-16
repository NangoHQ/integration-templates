import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        id: z.string().describe('The ID of the log entry to retrieve. Example: "Q02JTSNZWHSEKV"'),
        include: z
            .array(z.enum(['incidents', 'services', 'channels', 'teams']))
            .optional()
            .describe('Array of additional related models to include in the response.')
    })
    .describe('Input for retrieving a single PagerDuty log entry.');

const ReferenceSchema = z.object({
    id: z.string().describe('The unique identifier of the referenced resource.'),
    type: z.string().describe('The type of the referenced resource.'),
    summary: z.string().nullish().describe('A short-form summary of the referenced resource.'),
    self: z.string().nullish().describe('The API URL at which the referenced resource is accessible.'),
    html_url: z.string().nullish().describe('The URL at which the referenced resource is displayed in the PagerDuty web app.')
});

const ChannelSchema = z
    .object({
        type: z.string().describe('The type of channel through which the action was performed.')
    })
    .passthrough();

const ContextSchema = z.object({
    type: z.enum(['link', 'image']).describe('The type of context being attached.'),
    href: z.string().optional().describe('The link target URL.'),
    src: z.string().optional().describe('The image source URL.'),
    text: z.string().optional().describe('The alternate display text for an image.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique identifier of the log entry.'),
        type: z.string().describe('The type of the log entry.'),
        summary: z.string().nullish().describe('A short-form summary of the log entry.'),
        self: z.string().nullish().describe('The API URL at which the log entry is accessible.'),
        html_url: z.string().nullish().describe('The URL at which the log entry is displayed in the PagerDuty web app.'),
        created_at: z.string().optional().describe('The time at which the log entry was created.'),
        channel: ChannelSchema.optional().describe('The means by which the action was channeled.'),
        agent: ReferenceSchema.optional().describe('The agent (user, service, or integration) that created or modified the log entry.'),
        note: z.string().optional().describe('An optional note included with the log entry.'),
        contexts: z.array(ContextSchema).optional().describe('Contexts attached to the log entry, such as links or images.'),
        service: ReferenceSchema.optional().describe('The service associated with the log entry.'),
        incident: ReferenceSchema.optional().describe('The incident associated with the log entry.'),
        teams: z.array(ReferenceSchema).optional().describe('The teams associated with the log entry.'),
        event_details: z
            .object({
                description: z.string().optional().describe('Additional details about the event.')
            })
            .optional()
            .describe('Additional event details for trigger log entries.')
    })
    .passthrough()
    .describe('A single PagerDuty log entry.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single log entry by ID from the PagerDuty API.
 * @pitfalls: Log entry shape varies by `type` (e.g., `message` appears on status-update entries); reference `html_url` and `self` may be `null`.
 */
const action = createAction({
    description: 'Retrieve a single log entry.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developer.pagerduty.com/api-reference/c2NoOjk0NDQ3Ng-log-entries-get-a-log-entry
            endpoint: `/log_entries/${encodeURIComponent(input.id)}`,
            params: {
                ...(input.include !== undefined && { 'include[]': input.include })
            },
            retries: 3
        });

        if (!response.data || typeof response.data !== 'object' || !('log_entry' in response.data)) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Log entry not found or invalid response from provider.',
                log_entry_id: input.id
            });
        }

        const logEntry = OutputSchema.parse(response.data.log_entry);
        return logEntry;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
