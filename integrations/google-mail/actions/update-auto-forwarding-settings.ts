import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    enabled: z.boolean().describe('Whether all incoming mail is automatically forwarded to another address.'),
    email_address: z
        .string()
        .optional()
        .describe('Email address to which all incoming messages are forwarded. This email address must be a verified member of the forwarding addresses.'),
    disposition: z
        .enum(['dispositionUnspecified', 'leaveInInbox', 'archive', 'trash', 'markRead'])
        .optional()
        .describe('The state that a message should be left in after it has been forwarded.')
});

const ProviderAutoForwardingSchema = z.object({
    enabled: z.boolean(),
    emailAddress: z.string().optional(),
    disposition: z.enum(['dispositionUnspecified', 'leaveInInbox', 'archive', 'trash', 'markRead']).optional()
});

const OutputSchema = z.object({
    enabled: z.boolean(),
    email_address: z.string().optional(),
    disposition: z.enum(['dispositionUnspecified', 'leaveInInbox', 'archive', 'trash', 'markRead']).optional()
});

const action = createAction({
    description: 'Update Gmail auto-forwarding behavior and disposition',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/gmail.settings.sharing'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.enabled && !input.email_address) {
            throw new nango.ActionError({
                type: 'validation_error',
                message: 'email_address is required when enabled is true'
            });
        }

        const requestBody: {
            enabled: boolean;
            emailAddress?: string;
            disposition?: string;
        } = {
            enabled: input.enabled,
            ...(input.email_address !== undefined && { emailAddress: input.email_address }),
            ...(input.disposition !== undefined && { disposition: input.disposition })
        };

        // https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.settings/updateAutoForwarding
        const response = await nango.put({
            endpoint: '/gmail/v1/users/me/settings/autoForwarding',
            data: requestBody,
            retries: 3
        });

        const providerSettings = ProviderAutoForwardingSchema.parse(response.data);

        return {
            enabled: providerSettings.enabled,
            ...(providerSettings.emailAddress !== undefined && { email_address: providerSettings.emailAddress }),
            ...(providerSettings.disposition !== undefined && { disposition: providerSettings.disposition })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
