import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        projectId: z.number().describe('Project ID. Example: 48644099'),
        recordingId: z.number().describe('Recording ID. Example: 10239340934')
    })
    .describe('Input for retrieving audit-trail events for a Basecamp recording');

const CreatorSchema = z.object({
    id: z.number().describe('Person ID'),
    name: z.string().describe('Full name'),
    email_address: z.string().optional().describe('Email address, omitted for some integration-type people')
});

const EventSchema = z.object({
    id: z.number().describe('Event ID'),
    recording_id: z.number().describe('Recording ID this event belongs to'),
    action: z.string().describe('Event action type (e.g., created, archived, unarchived, completed)'),
    details: z.record(z.string(), z.unknown()).describe('Action-specific details'),
    created_at: z.string().describe('ISO 8601 timestamp of the event'),
    creator: CreatorSchema.describe('Person who triggered the event')
});

const OutputSchema = z
    .object({
        events: z.array(EventSchema).describe('List of audit-trail events for the recording')
    })
    .describe('Output containing audit-trail events for a Basecamp recording');

/**
 * @tags: [read]
 * @tagReason: Reads the audit-trail events for a recording from the Basecamp API.
 * @pitfalls: Events are returned newest-first; the `details` object structure varies by event type and may be empty.
 */
const action = createAction({
    description: 'Get the audit-trail events for any recording',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const events: z.infer<typeof EventSchema>[] = [];
        const paginator = nango.paginate({
            // https://raw.githubusercontent.com/basecamp/bc3-api/master/sections/events.md
            endpoint: `/buckets/${input.projectId}/recordings/${input.recordingId}/events.json`,
            paginate: {
                type: 'link',
                link_rel_in_response_header: 'next'
            },
            retries: 3
        });

        for await (const page of paginator) {
            for (const event of page) {
                const parsed = EventSchema.parse(event);
                events.push({
                    id: parsed.id,
                    recording_id: parsed.recording_id,
                    action: parsed.action,
                    details: parsed.details,
                    created_at: parsed.created_at,
                    creator: {
                        id: parsed.creator.id,
                        name: parsed.creator.name,
                        email_address: parsed.creator.email_address
                    }
                });
            }
        }

        return { events };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
