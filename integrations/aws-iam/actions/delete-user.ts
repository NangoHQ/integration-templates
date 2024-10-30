import type { NangoAction, ProxyConfiguration, SuccessResponse, UserNamentity } from '../../models';
import { getAWSAuthHeader } from '../helper/utils.js';

export default async function runAction(nango: NangoAction, input: UserNamentity): Promise<SuccessResponse> {
    if (!input || !input.userName) {
        throw new nango.ActionError({
            message: 'userName is required'
        });
    }

    // Set AWS IAM parameters
    const method = 'GET';
    const service = 'iam';
    const path = '/';
    const params = {
        Action: 'DeleteUser',
        UserName: input.userName,
        Version: '2010-05-08'
    };

    const querystring = new URLSearchParams(params).toString();

    const config: ProxyConfiguration = {
        endpoint: '/',
        params,
        retries: 10
    };

    // Get AWS authorization header
    const { authorizationHeader, date } = await getAWSAuthHeader(nango, method, service, path, querystring);

    // Make the delete user request
    await nango.get({
        ...config,
        headers: {
            'x-amz-date': date,
            Authorization: authorizationHeader,
        }
    });

    return {
        success: true
    };
}
