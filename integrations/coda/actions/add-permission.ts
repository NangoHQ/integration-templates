import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    docId: z.string().describe('ID of the doc to share. Example: "AbCDeFGH"'),
    access: z.enum(['readonly', 'write', 'comment']).describe('Access level to grant.'),
    principalType: z.enum(['email', 'anyone']).describe('Type of principal to share with.'),
    email: z.string().optional().describe('Email address of the user to share with. Required when principalType is "email".'),
    suppressEmail: z.boolean().optional().describe('When true, suppresses the email notification.')
});

const OutputSchema = z
    .object({
        id: z.string().optional(),
        access: z.string().optional(),
        principal: z
            .object({
                type: z.string().optional(),
                email: z.string().optional()
            })
            .optional()
    })
    .passthrough();

const action = createAction({
    description: 'Share a doc with a user or make it public.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    endpoint: {
        path: '/actions/add-permission',
        method: 'POST'
    },

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        if (input.principalType === 'email' && input.email === undefined) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'email is required when principalType is "email".'
            });
        }

        const data: Record<string, unknown> = {
            access: input.access,
            principal: {
                type: input.principalType,
                ...(input.principalType === 'email' && input.email !== undefined && { email: input.email })
            }
        };

        if (input.suppressEmail !== undefined) {
            data['suppressEmail'] = input.suppressEmail;
        }

        const response = await nango.post({
            // https://coda.io/developers/apis/v1#tag/Permissions/operation/addPermission
            endpoint: `/docs/${encodeURIComponent(input.docId)}/acl/permissions`,
            data,
            retries: 3
        });

        const providerPermission = OutputSchema.parse(response.data);
        return providerPermission;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
