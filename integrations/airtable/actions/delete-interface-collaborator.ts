import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    baseId: z.string().describe('The ID of the Airtable base. Example: "app1234567890abcd"'),
    pageBundleId: z.string().describe('The ID of the interface page bundle. Example: "pag1234567890abcd"'),
    userOrGroupId: z.string().describe('The ID of the user or user group to remove as a collaborator. Example: "usr1234567890abcd" or "grp1234567890abcd"')
});

const OutputSchema = z.object({
    success: z.boolean().describe('Whether the collaborator was successfully removed'),
    baseId: z.string().describe('The ID of the Airtable base'),
    pageBundleId: z.string().describe('The ID of the interface page bundle'),
    userOrGroupId: z.string().describe('The ID of the removed collaborator'),
    error: z.string().optional().describe('Error message if the deletion failed')
});

const action = createAction({
    description: 'Remove a collaborator from an Airtable interface page',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/delete-interface-collaborator',
        group: 'Interface Collaborators'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://airtable.com/developers/web/api/delete-interface-collaborator
        const response = await nango.delete({
            endpoint: `/v0/meta/bases/${input.baseId}/interfaces/${input.pageBundleId}/collaborators/${input.userOrGroupId}`,
            retries: 3
        });

        // Handle 404 - resource not found
        if (response.status === 404) {
            return {
                success: false,
                baseId: input.baseId,
                pageBundleId: input.pageBundleId,
                userOrGroupId: input.userOrGroupId,
                error: 'Interface page or collaborator not found. Verify the IDs and ensure the base has interface pages with collaborators.'
            };
        }

        return {
            success: true,
            baseId: input.baseId,
            pageBundleId: input.pageBundleId,
            userOrGroupId: input.userOrGroupId
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
