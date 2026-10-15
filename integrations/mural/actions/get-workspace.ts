import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        workspaceId: z.string().describe('Unique ID of the workspace to retrieve. Example: "nangodev4776"')
    })
    .describe('Input for retrieving a single workspace.');

const ProviderUserSchema = z.object({
    id: z.string(),
    email: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    type: z.string().optional()
});

const ProviderSharingSettingsSchema = z.object({
    link: z.string().optional()
});

const ProviderWorkspaceSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    image: z.string().optional(),
    createdOn: z.number(),
    createdBy: ProviderUserSchema.optional(),
    locked: z.boolean(),
    suspended: z.boolean(),
    sharingSettings: ProviderSharingSettingsSchema.optional(),
    companyId: z.string().optional(),
    trialEnds: z.string().optional(),
    trialExtended: z.boolean().optional()
});

const ProviderResponseSchema = z.object({
    value: ProviderWorkspaceSchema
});

const WorkspaceUserSchema = z
    .object({
        id: z.string().describe('Unique ID of the user.'),
        email: z.string().optional().describe('Email address of the user.'),
        firstName: z.string().optional().describe('First name of the user.'),
        lastName: z.string().optional().describe('Last name of the user.'),
        type: z.string().optional().describe('Membership type of the user, for example "member".')
    })
    .describe('Information about the user who created the workspace.');

const WorkspaceSharingSettingsSchema = z
    .object({
        link: z.string().optional().describe('Invitation link that a member with an account can use to access the workspace. Treat as sensitive.')
    })
    .describe('Sharing settings for the workspace.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique ID of the workspace.'),
        name: z.string().describe('Name of the workspace.'),
        description: z.string().optional().describe('Description of the workspace. Empty string when the workspace has no description.'),
        image: z.string().optional().describe('URL of the workspace avatar image.'),
        createdOn: z.number().describe('Creation time of the workspace as Unix epoch milliseconds.'),
        createdBy: WorkspaceUserSchema.optional().describe('Information about the user who created the workspace.'),
        locked: z.boolean().describe('Whether the workspace is locked.'),
        suspended: z.boolean().describe('Whether the workspace has been suspended.'),
        sharingSettings: WorkspaceSharingSettingsSchema.optional().describe('Sharing settings for the workspace.')
    })
    .describe('A single Mural workspace.');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single workspace's details and does not modify any provider state.
 * @pitfalls: Only workspaces the authenticated user has read access to are returned, and an inaccessible or nonexistent workspace both surface as a not-found error; sharingSettings.link is a live invitation URL that grants workspace access, so treat it as sensitive.
 */
const action = createAction({
    description: 'Retrieve a single workspace by ID, including who created it.',
    version: '1.0.0',
    scopes: ['workspaces:read'],
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getworkspace
        const response = await nango.get({
            endpoint: `/api/public/v1/workspaces/${encodeURIComponent(input.workspaceId)}`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);
        const workspace = parsed.value;

        return {
            id: workspace.id,
            name: workspace.name,
            ...(workspace.description != null && { description: workspace.description }),
            ...(workspace.image != null && { image: workspace.image }),
            createdOn: workspace.createdOn,
            ...(workspace.createdBy != null && { createdBy: workspace.createdBy }),
            locked: workspace.locked,
            suspended: workspace.suspended,
            ...(workspace.sharingSettings != null && { sharingSettings: workspace.sharingSettings })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
