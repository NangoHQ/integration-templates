import type { NangoAction, ProxyConfiguration, SuccessResponse, EmailEntity } from '../../models';
import { FreshdeskAgent } from '../types';
import { emailEntitySchema } from '../schema.zod.js';

async function fetchUserIdByEmail(nango: NangoAction, email: string): Promise<string | undefined> {
    const proxyConfiguration: ProxyConfiguration = {
        // https://developer.freshdesk.com/api/#list_all_agents
        endpoint: '/api/v2/agents',
        retries: 10,
        paginate: {
            type: 'link',
            limit_name_in_request: 'per_page',
            link_rel_in_response_header: 'next',
            limit: 100
        }
    };

    for await (const freshdeskUsers of nango.paginate<FreshdeskAgent>(proxyConfiguration)) {
        const foundUser = freshdeskUsers.find(user => user.contact.email === email);

        if (foundUser) {
            return foundUser.id.toString();
        }
    }

    return undefined;
}

export default async function runAction(nango: NangoAction, input: EmailEntity): Promise<SuccessResponse> {
    const parsedInput = emailEntitySchema.safeParse(input);

    if (!parsedInput.success) {
        throw new nango.ActionError({
            message: 'Invalid input provided to delete a user'
        });
    }

    const foundUserId = await fetchUserIdByEmail(nango, input.email);

    if (!foundUserId) {
        throw new nango.ActionError({
            message: 'User with the provided email not found'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.freshdesk.com/api/#delete_agent
        endpoint: `/api/v2/agents/${foundUserId}`,
        retries: 10
    };

    await nango.delete(config);

    return {
        success: true
    };
}

