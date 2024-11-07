import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { getOrganizationId } from '../helpers/get-organization-id';
import { emailEntitySchema } from '../../../../box/schema.zod.js';

async function getUserIdByEmail(nango: NangoAction, organizationId: string, email: string): Promise<string> {
    const getMembershipConfig: ProxyConfiguration = {
        endpoint: `/organization_memberships`,
        params: {
            organization: `https://api.calendly.com/organizations/${organizationId}`,
            email: email
        },
        paginate: {
            response_path: 'collection',
            limit_name_in_request: 'count',
            limit: 100
        }
    };

    for await (const orgMemberships of nango.paginate(getMembershipConfig)) {
        const membership = orgMemberships[0];
        if (membership) {
            return membership.uri.split('/').pop()!;
        }
    }

    throw new nango.ActionError({
        message: `No user found with email ${email}`
    });
}

/**
 * Executes the delete user action by validating input, constructing the endpoint,
 * and making the API call to Calendly to delete the user from an organization.
 */
export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const organizationId = await getOrganizationId(nango);
    const userId = await getUserIdByEmail(nango, organizationId, input.email);

    await nango.log(`Deleting user ${userId} from organization ${organizationId}`);

    const deleteUserConfig: ProxyConfiguration = {
        endpoint: `/organization_memberships/${userId}`,
        retries: 10
    };

    await nango.delete(deleteUserConfig);

    return {
        success: true
    };
}

