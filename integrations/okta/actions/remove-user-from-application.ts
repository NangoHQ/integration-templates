import type { ProxyConfiguration } from 'nango';
import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    appId: z.string().describe('Application ID. Example: "0oa14y5qldjOIAGrc698"'),
    userId: z.string().describe('User ID. Example: "00u14y5plo5MraBIf698"'),
    sendEmail: z.boolean().optional().describe('Whether to send an email to the user. Defaults to true.')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const action = createAction({
    description: 'Unassign a user from an application.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['okta.apps.manage'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developer.okta.com/docs/reference/api/apps/#remove-user-from-application
            endpoint: `/api/v1/apps/${encodeURIComponent(input.appId)}/users/${encodeURIComponent(input.userId)}`,
            params: {
                ...(input.sendEmail !== undefined && { sendEmail: String(input.sendEmail) })
            },
            retries: 3
        };

        await nango.delete(config);

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
