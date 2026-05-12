import { createSync } from 'nango';
import { z } from 'zod';

const OrganizationMembershipSchema = z.object({
    id: z.string(),
    uri: z.string(),
    role: z.string(),
    organizationUri: z.string(),
    userUri: z.string(),
    userEmail: z.string().optional(),
    userName: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional()
});

const CheckpointSchema = z.object({
    pageToken: z.string(),
    organizationUri: z.string()
});

// Provider response schemas matching Calendly API
const ProviderUserSchema = z
    .object({
        uri: z.string(),
        email: z.string().optional(),
        name: z.string().optional()
    })
    .passthrough();

const ProviderOrganizationMembershipSchema = z
    .object({
        uri: z.string(),
        role: z.string(),
        organization: z.string(),
        user: ProviderUserSchema,
        created_at: z.string().optional(),
        updated_at: z.string().optional()
    })
    .passthrough();

const ProviderPaginationSchema = z.object({
    next_page_token: z.string().nullable().optional(),
    previous_page_token: z.string().nullable().optional(),
    next_page: z.string().nullable().optional(),
    previous_page: z.string().nullable().optional(),
    count: z.number().optional()
});

const ProviderResponseSchema = z.object({
    collection: z.array(ProviderOrganizationMembershipSchema),
    pagination: ProviderPaginationSchema
});

const UsersMeResourceSchema = z.object({
    uri: z.string(),
    current_organization: z.string().optional()
});

const UsersMeResponseSchema = z.object({
    resource: UsersMeResourceSchema
});

const sync = createSync<
    {
        OrganizationMembership: typeof OrganizationMembershipSchema;
    },
    undefined,
    typeof CheckpointSchema
>({
    description: 'Sync organization memberships from Calendly',
    version: '1.0.0',
    frequency: 'every hour',
    autoStart: true,
    endpoints: [
        {
            method: 'GET',
            path: '/organization-memberships'
        }
    ],
    checkpoint: CheckpointSchema,
    models: {
        OrganizationMembership: OrganizationMembershipSchema
    },

    exec: async (nango) => {
        const checkpoint = await nango.getCheckpoint();

        let organizationUri = checkpoint?.organizationUri || '';

        if (!organizationUri) {
            // https://developer.calendly.com/api-docs/6a641a018f819-list-user
            const usersMeResponse = await nango.get({
                endpoint: '/users/me',
                retries: 3
            });

            const parseUsersMeResult = UsersMeResponseSchema.safeParse(usersMeResponse.data);
            if (!parseUsersMeResult.success) {
                await nango.log('Failed to parse users/me response', { level: 'error' });
                return;
            }

            const usersMeData = parseUsersMeResult.data.resource;
            organizationUri = usersMeData.current_organization || '';

            if (!organizationUri) {
                await nango.log('No organization found for user', { level: 'error' });
                return;
            }
        }

        await nango.trackDeletesStart('OrganizationMembership');

        let pageToken = checkpoint?.pageToken || '';

        do {
            // https://developer.calendly.com/api-docs/eaed2e61a6bc3-list-organization-memberships
            const params: Record<string, string> = {
                organization: organizationUri,
                count: '100'
            };
            if (pageToken) {
                params['page_token'] = pageToken;
            }

            const response = await nango.get({
                endpoint: '/organization_memberships',
                params,
                retries: 3
            });

            const parseResult = ProviderResponseSchema.safeParse(response.data);
            if (!parseResult.success) {
                throw new Error(`Failed to parse organization memberships response: ${parseResult.error.message}`);
            }

            const data = parseResult.data;
            const memberships = data.collection.map((item) => {
                const id = item.uri.split('/').pop() || item.uri;

                return {
                    id,
                    uri: item.uri,
                    role: item.role,
                    organizationUri: item.organization,
                    userUri: item.user.uri,
                    ...(item.user.email != null && { userEmail: item.user.email }),
                    ...(item.user.name != null && { userName: item.user.name }),
                    ...(item.created_at != null && { createdAt: item.created_at }),
                    ...(item.updated_at != null && { updatedAt: item.updated_at })
                };
            });

            if (memberships.length > 0) {
                await nango.batchSave(memberships, 'OrganizationMembership');
            }

            pageToken = data.pagination.next_page_token || '';

            if (pageToken) {
                await nango.saveCheckpoint({
                    pageToken,
                    organizationUri
                });
            }
        } while (pageToken);

        await nango.trackDeletesEnd('OrganizationMembership');

        await nango.saveCheckpoint({
            pageToken: '',
            organizationUri
        });
    }
});

export type NangoSyncLocal = Parameters<(typeof sync)['exec']>[0];
export default sync;
