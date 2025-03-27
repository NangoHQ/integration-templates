import type { NangoAction, ProxyConfiguration, SuccessResponse, IdEntity } from '../../models';

export default async function runAction(nango: NangoAction, input: IdEntity): Promise<SuccessResponse> {
    if (!input.id) {
        throw new nango.ActionError({
            message: 'Id is required to delete a user'
        });
    }

    const config: ProxyConfiguration = {
        // https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-users/#api-rest-api-3-user-delete
        endpoint: `/rest/api/3/user`,
        params: {
            accountId: input.id
        },
        retries: 3
    };

    await nango.delete(config);

    return {
        success: true
    };
}
