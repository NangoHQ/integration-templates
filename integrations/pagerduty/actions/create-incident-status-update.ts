import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident to post a status update on. Example: "Q0YLGGHWAI1DDT"'),
        message: z.string().describe('The human-readable status update message to post. Example: "We are investigating the issue."'),
        from_email: z.string().describe('The email address of the user making the request, required by PagerDuty as the From header. Example: "api@nango.dev"')
    })
    .describe('Input to create a status update on a PagerDuty incident.');

const SenderSchema = z.object({
    id: z.string().describe('The ID of the user who sent the status update.'),
    type: z.string().optional().describe('The type of the sender reference.'),
    summary: z.string().optional().describe('A short summary of the sender.'),
    self: z.string().optional().describe('The API URL of the sender resource.'),
    html_url: z.string().optional().describe('The PagerDuty web UI URL of the sender.')
});

const StatusUpdateSchema = z.object({
    id: z.string().describe('The ID of the created status update.'),
    message: z.string().describe('The message of the status update.'),
    sender: SenderSchema.optional().describe('The user who sent the status update.'),
    created_at: z.string().optional().describe('The date/time when this status update was created.'),
    request_method: z.string().optional().describe('The method used to create the status update, e.g. "API".'),
    subject: z.string().optional().describe('The subject of the custom html email status update, if included in the request.'),
    html_message: z.string().optional().describe('The html content of the custom email status update, if included in the request.')
});

const OutputSchema = z
    .object({
        status_update: StatusUpdateSchema.describe('The created status update object.')
    })
    .describe('The created incident status update response from PagerDuty.');

/**
 * @tags: [write]
 * @tagReason: Posts a new status update to an incident via the PagerDuty REST API.
 * @pitfalls: Requires a valid user email as the PagerDuty From header on every call.
 */
const action = createAction({
    description: 'Post a human-readable status update on an incident (visible to subscribers).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developer.pagerduty.com/api-reference/594c9ed714b93-create-a-status-update-on-an-incident
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/status_updates`,
            headers: {
                From: input.from_email
            },
            data: {
                message: input.message
            },
            retries: 10
        });

        const parsed = OutputSchema.parse(response.data);
        return parsed;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
