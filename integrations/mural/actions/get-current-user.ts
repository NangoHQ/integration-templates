import { z } from 'zod';
import { createAction } from 'nango';

const ProviderMeResponseSchema = z.object({
    value: z.object({
        id: z.string(),
        email: z.string().nullable().optional(),
        avatar: z.string().nullable().optional(),
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        type: z.string(),
        createdOn: z.number().nullable().optional(),
        companyId: z.string().nullable().optional(),
        companyName: z.string().nullable().optional(),
        lastActiveWorkspace: z.string().nullable().optional()
    })
});

const InputSchema = z.object({}).describe('No input parameters; the connection determines the user.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the authenticated user. Example: "u1651c4ac9145e4b8497d5982"'),
        email: z.string().optional().describe('Email address of the authenticated user. Example: "user@example.com"'),
        avatar: z.string().optional().describe("URL of the authenticated user's avatar image, when set."),
        firstName: z.string().optional().describe('First name of the authenticated user, when set. Example: "John"'),
        lastName: z.string().optional().describe('Last name of the authenticated user, when set. Example: "Smith"'),
        type: z.string().describe('Type of collaborator account. Example: "member"'),
        createdOn: z.number().optional().describe('Timestamp when the user account was created, in milliseconds since the Unix epoch. Example: 1608060691000'),
        companyId: z.string().optional().describe('Unique identifier of the company the user belongs to, when the user belongs to one.'),
        companyName: z.string().optional().describe('Name of the company the user belongs to, when the user belongs to one.'),
        lastActiveWorkspace: z
            .string()
            .optional()
            .describe('ID of the workspace the user most recently had active, usable as a default workspace. Example: "workspace1234"')
    })
    .describe('Profile of the user this connection authenticates as.');

/**
 * @tags: [read]
 * @tagReason: Reads the authenticated user's profile and never modifies any provider data.
 */
const action = createAction({
    description: 'Get the profile of the user this connection authenticates as.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['identity:read'],

    exec: async (nango): Promise<z.infer<typeof OutputSchema>> => {
        // https://developers.mural.co/public/reference/getcurrentmember
        const response = await nango.get({
            endpoint: '/api/public/v1/users/me',
            retries: 3
        });

        const providerUser = ProviderMeResponseSchema.parse(response.data).value;

        return {
            id: providerUser.id,
            ...(providerUser.email != null && { email: providerUser.email }),
            ...(providerUser.avatar != null && { avatar: providerUser.avatar }),
            ...(providerUser.firstName != null && { firstName: providerUser.firstName }),
            ...(providerUser.lastName != null && { lastName: providerUser.lastName }),
            type: providerUser.type,
            ...(providerUser.createdOn != null && { createdOn: providerUser.createdOn }),
            ...(providerUser.companyId != null && { companyId: providerUser.companyId }),
            ...(providerUser.companyName != null && { companyName: providerUser.companyName }),
            ...(providerUser.lastActiveWorkspace != null && { lastActiveWorkspace: providerUser.lastActiveWorkspace })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
