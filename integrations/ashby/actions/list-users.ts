import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    cursor: z.string().optional().describe('Opaque cursor indicating which page of results to fetch.'),
    limit: z.number().optional().describe('The maximum number of items to return. The maximum and default value is 100.'),
    includeDeactivated: z.boolean().optional().describe('If set to true, deactivated users are included in the response.'),
    syncToken: z.string().optional().describe('An opaque token representing the last time the data was successfully synced from the API.')
});

const ProviderUserSchema = z.object({
    id: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    email: z.string().nullable(),
    globalRole: z.string().nullable(),
    isEnabled: z.boolean().nullable(),
    updatedAt: z.string().nullable()
});

const UserSchema = z.object({
    id: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().optional(),
    globalRole: z.string().optional(),
    isEnabled: z.boolean().optional(),
    updatedAt: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(UserSchema),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    results: z.array(ProviderUserSchema).optional(),
    moreDataAvailable: z.boolean().optional(),
    nextCursor: z.string().optional(),
    syncToken: z.string().optional()
});

const action = createAction({
    description: 'List users from Ashby.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['organizationRead'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: { cursor?: string; limit?: number; includeDeactivated?: boolean; syncToken?: string } = {};
        if (input.cursor !== undefined) {
            requestBody.cursor = input.cursor;
        }
        if (input.limit !== undefined) {
            requestBody.limit = input.limit;
        }
        if (input.includeDeactivated !== undefined) {
            requestBody.includeDeactivated = input.includeDeactivated;
        }
        if (input.syncToken !== undefined) {
            requestBody.syncToken = input.syncToken;
        }

        // https://developers.ashbyhq.com/reference/userlist
        const response = await nango.post({
            endpoint: 'user.list',
            data: requestBody,
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Ashby API returned a non-success response'
            });
        }

        const items = (providerResponse.results ?? []).map((user) => ({
            id: user.id,
            ...(user.firstName != null && { firstName: user.firstName }),
            ...(user.lastName != null && { lastName: user.lastName }),
            ...(user.email != null && { email: user.email }),
            ...(user.globalRole != null && { globalRole: user.globalRole }),
            ...(user.isEnabled != null && { isEnabled: user.isEnabled }),
            ...(user.updatedAt != null && { updatedAt: user.updatedAt })
        }));

        return {
            items,
            ...(providerResponse.nextCursor != null && { nextCursor: providerResponse.nextCursor }),
            ...(providerResponse.syncToken != null && { syncToken: providerResponse.syncToken })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
