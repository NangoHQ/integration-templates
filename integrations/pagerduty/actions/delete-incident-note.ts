import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        incident_id: z.string().describe('The ID of the incident containing the note. Example: "Q3NJ6O318IPQU0"'),
        note_id: z.string().describe('The ID of the note to delete. Example: "PEVWHPJ"'),
        from: z
            .string()
            .email()
            .optional()
            .describe('The email address of the user performing the deletion. If omitted, the current connection user email is fetched automatically.')
    })
    .describe('Input parameters to delete a note from a PagerDuty incident.');

const OutputSchema = z.null().describe('Empty response indicating the note was deleted successfully.');

/**
 * @tags: [write, destructive]
 * @tagReason: Permanently deletes a note from a PagerDuty incident.
 */
const action = createAction({
    description: 'Delete a note from an incident.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['incidents.write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        let fromEmail = input.from;
        if (!fromEmail) {
            const userConfig: ProxyConfiguration = {
                // https://developer.pagerduty.com/api-reference/e8b6f95f7030f-get-current-user
                endpoint: '/users/me',
                retries: 3
            };
            const userResponse = await nango.get(userConfig);
            const userData = z
                .object({
                    user: z.object({
                        email: z.string()
                    })
                })
                .parse(userResponse.data);
            fromEmail = userData.user.email;
        }

        // https://developer.pagerduty.com/api-reference/
        await nango.delete({
            endpoint: `/incidents/${encodeURIComponent(input.incident_id)}/notes/${encodeURIComponent(input.note_id)}`,
            headers: {
                From: fromEmail
            },
            retries: 3
        });

        return null;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
