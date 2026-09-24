import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident to add the note to.'),
        content: z.string().describe('The content of the note to create.'),
        from: z.string().describe('The email address of the user creating the note, sent in the From header.')
    })
    .describe('Input for adding a note to a PagerDuty incident.');

const ChannelSchema = z.object({
    summary: z.string().describe('A summary of the channel through which the note was created.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('The unique ID of the created note.'),
        content: z.string().describe('The content of the created note.'),
        channel: ChannelSchema.describe('The channel through which the note was created.')
    })
    .describe('Output returned after successfully creating a note on a PagerDuty incident.');

/**
 * @tags: [write]
 * @tagReason: Creates a new note on a PagerDuty incident.
 * @pitfalls: A maximum of 2000 notes can be added to a single incident.
 */
const action = createAction({
    description: 'Add a note to an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/b3A6Mjc0ODE1MA-create-a-note-on-an-incident
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/notes`,
            headers: {
                From: input.from
            },
            data: {
                note: {
                    content: input.content
                }
            },
            retries: 10
        });

        const providerNote = z
            .object({
                note: z.object({
                    id: z.string(),
                    content: z.string(),
                    channel: z.object({
                        summary: z.string()
                    })
                })
            })
            .parse(response.data);

        return {
            id: providerNote.note.id,
            content: providerNote.note.content,
            channel: {
                summary: providerNote.note.channel.summary
            }
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
