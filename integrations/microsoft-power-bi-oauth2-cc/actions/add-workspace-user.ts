import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    workspaceId: z.string().describe('Workspace (group) ID. Example: "149ca924-4333-471b-94b5-347eca3f9938"'),
    identifier: z.string().describe('UPN, object id, or app id of the user or principal to add. Example: "user@contoso.com"'),
    groupUserAccessRight: z.enum(['Admin', 'Member', 'Contributor', 'Viewer']).describe('Access level to grant.'),
    principalType: z.enum(['User', 'App', 'Group']).describe('Type of principal being added.')
});

const OutputSchema = z.object({
    workspaceId: z.string(),
    identifier: z.string(),
    groupUserAccessRight: z.string(),
    principalType: z.string()
});

const action = createAction({
    description: 'Grant a user or service principal access to a workspace.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://learn.microsoft.com/en-us/rest/api/power-bi/groups/add-group-user
        await nango.post({
            endpoint: `/v1.0/myorg/groups/${encodeURIComponent(input.workspaceId)}/users`,
            data: {
                identifier: input.identifier,
                groupUserAccessRight: input.groupUserAccessRight,
                principalType: input.principalType
            },
            retries: 1
        });

        return {
            workspaceId: input.workspaceId,
            identifier: input.identifier,
            groupUserAccessRight: input.groupUserAccessRight,
            principalType: input.principalType
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
