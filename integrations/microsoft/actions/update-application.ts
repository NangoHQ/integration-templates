import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().min(1).describe('The unique identifier of the application object. Example: "cc67332f-dfd9-43f0-af0f-bc0ff5334965"'),
    displayName: z.string().optional().describe('The display name for the application.'),
    description: z.string().nullable().optional().describe('An optional description of the application.'),
    signInAudience: z
        .enum(['AzureADMyOrg', 'AzureADMultipleOrgs', 'AzureADandPersonalMicrosoftAccount'])
        .optional()
        .describe('Specifies what Microsoft accounts are supported.'),
    groupMembershipClaims: z.enum(['None', 'SecurityGroup', 'All']).optional().describe('Configures the groups claim issued in tokens.'),
    tags: z.array(z.string()).optional().describe('Custom strings to categorize and identify the application.'),
    isFallbackPublicClient: z.boolean().nullable().optional().describe('Specifies the fallback application type as public client.')
});

const OutputSchema = z.object({
    id: z.string(),
    success: z.boolean()
});

const action = createAction({
    description: 'Update an application in Microsoft Entra',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-application',
        group: 'Applications'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['Application.ReadWrite.All'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.displayName !== undefined) {
            updateData['displayName'] = input.displayName;
        }
        if (input.description !== undefined) {
            updateData['description'] = input.description;
        }
        if (input.signInAudience !== undefined) {
            updateData['signInAudience'] = input.signInAudience;
        }
        if (input.groupMembershipClaims !== undefined) {
            updateData['groupMembershipClaims'] = input.groupMembershipClaims;
        }
        if (input.tags !== undefined) {
            updateData['tags'] = input.tags;
        }
        if (input.isFallbackPublicClient !== undefined) {
            updateData['isFallbackPublicClient'] = input.isFallbackPublicClient;
        }

        if (Object.keys(updateData).length === 0) {
            throw new nango.ActionError({
                type: 'invalid_input',
                message: 'At least one field to update must be provided'
            });
        }

        // https://learn.microsoft.com/en-us/graph/api/application-update
        await nango.patch({
            endpoint: `/v1.0/applications/${encodeURIComponent(input.id)}`,
            data: updateData,
            retries: 3
        });

        return {
            id: input.id,
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
