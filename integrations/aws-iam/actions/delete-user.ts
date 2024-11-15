import type { NangoAction, ProxyConfiguration, SuccessResponse, UserNamEntity } from '../../models';
import { getAWSAuthHeader } from '../helper/utils.js';
import type { AWSIAMRequestParams } from '../types';

export default async function runAction(nango: NangoAction, input: UserNamEntity): Promise<SuccessResponse> {
    if (!input || !input.userName) {
        throw new nango.ActionError({
            message: 'userName is required'
        });
    }

    // Set AWS IAM parameters
    const awsIAMParams: AWSIAMRequestParams = {
        method: 'GET',
        service: 'iam',
        path: '/',
        params: {
            Action: 'DeleteUser',
            UserName: input.userName,
            Version: '2010-05-08'
        }
    };

    const querystring = new URLSearchParams(awsIAMParams.params).toString();

    // Get AWS authorization header
    const { authorizationHeader, date } = await getAWSAuthHeader(nango, awsIAMParams.method, awsIAMParams.service, awsIAMParams.path, querystring);

    const config: ProxyConfiguration = {
        // https://docs.aws.amazon.com/IAM/latest/APIReference/API_DeleteUser.html
        endpoint: awsIAMParams.path,
        params: awsIAMParams.params,
        retries: 10
    };

    await nango.get({
        ...config,
        headers: {
            'x-amz-date': date,
            Authorization: authorizationHeader
        },
        retries: 10
    });

    return {
        success: true
    };
}
