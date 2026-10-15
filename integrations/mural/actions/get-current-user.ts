import { z } from 'zod';
import { createAction } from 'nango';

const ProviderMeResponseSchema = z.object({
    value: z.object({
        id: z.string(),
        email: z.string().optional(),
        avatar: z.string(),
        firstName: z.string(),
        lastName: z.string(),
        type: z.string(),
        createdOn: z.number().optional(),
        companyId: z.string().optional(),
        companyName: z.string().optional(),
        lastActiveWorkspace: z.string().optional()
    })
});

const InputSchema = z.object({}).describe('No input parameters; the connection determines the user.');

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the authenticated user. Example: "u1651c4ac9145e4b8497d5982"'),
        email: z.string().optional().describe('Email address of the authenticated user. Example: "user@example.com"'),
        avatar: z.string().describe("URL of the authenticated user's avatar image."),
        firstName: z.string().describe('First name of the authenticated user. Example: "John"'),
        lastName: z.string().describe('Last name of the authenticated user. Example: "Smith"'),
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
            avatar: providerUser.avatar,
            firstName: providerUser.firstName,
            lastName: providerUser.lastName,
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
