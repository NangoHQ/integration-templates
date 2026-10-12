import { z } from 'zod';
import { createAction } from 'nango';

const SpaceMemberSchema = z.object({
    id: z.string().describe('User or group ID of the member. Example: "KUAZR5CO"'),
    accessRoleId: z.string().describe('Access role ID held by the member in the Space.'),
    isManager: z.boolean().describe('Whether the member is a Space manager.')
});

const SpaceSchema = z.object({
    id: z.string().describe('Opaque Wrike Space ID. It is the same id as the corresponding root-level folder in the folders listing. Example: "MQAAAAEQ_HoD"'),
    title: z.string().describe('Space display name. Example: "First space"'),
    avatarUrl: z.string().optional().describe('URL of the Space avatar image.'),
    accessType: z.enum(['Locked', 'Personal', 'Private', 'Public']).optional().describe('Access level of the Space.'),
    archived: z.boolean().optional().describe('Whether the Space is archived.'),
    guestRoleId: z.string().optional().describe('Access role applied to guests in the Space.'),
    defaultProjectWorkflowId: z.string().optional().describe('Workflow ID applied to projects created in the Space by default.'),
    defaultTaskWorkflowId: z.string().optional().describe('Workflow ID applied to tasks created in the Space by default.'),
    description: z.string().optional().describe('Space description, when one is set.'),
    suggestedProjectWorkflowIds: z.array(z.string()).optional().describe('Suggested project workflow IDs for the Space.'),
    suggestedTaskWorkflowIds: z.array(z.string()).optional().describe('Suggested task workflow IDs for the Space.'),
    workScheduleId: z.string().optional().describe('Work schedule assigned to the Space (returned only when requested via fields).'),
    members: z.array(SpaceMemberSchema).optional().describe('Space members (returned only when requested via fields).')
});

const InputSchema = z
    .object({
        withArchived: z.boolean().optional().describe('Include archived Spaces. Defaults to false, so archived Spaces are excluded unless this is true.'),
        userIsMember: z.boolean().optional().describe('Return only Spaces the connected user is a member of.'),
        withInvitations: z.boolean().optional().describe('Include pending member invitations (only meaningful when members are requested via fields).'),
        title: z.string().optional().describe('Case-insensitive contains match on the Space title. Blank values are ignored by the provider.'),
        accessTypes: z
            .array(z.enum(['Locked', 'Personal', 'Private', 'Public']))
            .optional()
            .describe('Return only Spaces matching any of these access types.'),
        fields: z
            .array(z.enum(['members', 'workScheduleId']))
            .optional()
            .describe('Optional fields to include on each Space: members and/or workScheduleId.')
    })
    .describe('Optional filters for listing the account Spaces.');

const OutputSchema = z
    .object({
        spaces: z.array(SpaceSchema).describe('Account Spaces matching the provided filters, ordered as returned by the provider.')
    })
    .describe('Spaces (top-level containers for folders and projects) in the account.');

const ProviderResponseSchema = z.object({
    kind: z.string(),
    data: z.array(SpaceSchema)
});

/**
 * @tags: [read]
 * @tagReason: Reads the account's Spaces via the provider's list endpoint; no provider state is changed.
 * @pitfalls: Archived Spaces are omitted unless withArchived is true, and members/workScheduleId are only populated when requested via fields; a Space id is identical to its corresponding root-level folder id in the folders listing.
 */
const action = createAction({
    description: 'List the account Spaces (top-level containers for folders and projects, each with its own default workflows and access type).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://developers.wrike.com/api/v4/spaces/
            endpoint: '/spaces',
            params: {
                ...(input.withArchived !== undefined && { withArchived: String(input.withArchived) }),
                ...(input.userIsMember !== undefined && { userIsMember: String(input.userIsMember) }),
                ...(input.withInvitations !== undefined && { withInvitations: String(input.withInvitations) }),
                ...(input.title !== undefined && { title: input.title }),
                ...(input.accessTypes !== undefined && { accessTypes: JSON.stringify(input.accessTypes) }),
                ...(input.fields !== undefined && { fields: JSON.stringify(input.fields) })
            },
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            spaces: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
