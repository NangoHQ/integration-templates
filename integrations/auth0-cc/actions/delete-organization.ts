import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    organization_id: z.string().describe('Organization ID. Example: "org_abc123"')
});

const OutputSchema = z.object({
    success: z.boolean(),
    organization_id: z.string()
});

const action = createAction({
    description: 'Delete or archive an organization in Auth0.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-organization',
        group: 'Organizations'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['delete:organizations'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.delete({
            // https://auth0.com/docs/api/management/v2/organizations/delete-organizations-by-id
            endpoint: `/api/v2/organizations/${encodeURIComponent(input.organization_id)}`,
            retries: 10
        });

        if (response.status !== 204) {
            throw new nango.ActionError({
                type: 'delete_failed',
                message: `Unexpected status ${response.status} when deleting organization ${input.organization_id}.`,
                organization_id: input.organization_id
            });
        }

        return {
            success: true,
            organization_id: input.organization_id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
