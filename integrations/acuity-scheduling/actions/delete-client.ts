import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    firstName: z.string().describe('Client first name. Example: "Bob"'),
    lastName: z.string().describe('Client last name. Example: "McTest"'),
    phone: z.string().optional().describe('Client phone number. Example: "(123) 555-0102"')
});

const OutputSchema = z.object({
    success: z.boolean()
});

const ErrorResponseSchema = z.object({
    status_code: z.number().optional(),
    message: z.string().optional(),
    error: z.string().optional()
});

const action = createAction({
    description: 'Delete a client.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-client',
        group: 'Clients'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://developers.acuityscheduling.com/reference/delete-clients
            endpoint: '/clients',
            params: {
                firstName: input.firstName,
                lastName: input.lastName,
                ...(input.phone !== undefined && { phone: input.phone })
            },
            retries: 3
        });

        if (response.status >= 200 && response.status < 300) {
            return { success: true };
        }

        const errorData = ErrorResponseSchema.safeParse(response.data);
        if (errorData.success) {
            throw new nango.ActionError({
                type: errorData.data.error || 'delete_failed',
                message: errorData.data.message || 'Failed to delete client'
            });
        }

        throw new nango.ActionError({
            type: 'delete_failed',
            message: 'Failed to delete client'
        });
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
