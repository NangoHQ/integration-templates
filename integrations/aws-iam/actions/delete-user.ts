import { createAction } from 'nango';
import { getAWSAuthHeader } from '../helper/utils.js';
import type { AWSIAMRequestParams } from '../types.js';

import type { ProxyConfiguration } from 'nango';
import { SuccessResponse, UserNamEntity } from '../models.js';

const action = createAction({
    description: 'Delete an existing user in AWS IAM. When you delete a user, you must delete the items attached to the user manually, or the deletion fails.',
    version: '1.0.0',

    endpoint: {
        method: 'DELETE',
        path: '/users',
        group: 'Users'
    },

    input: UserNamEntity,
    output: SuccessResponse,

    exec: async (nango, input): Promise<SuccessResponse> => {
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
            retries: 3
        };

        await nango.get({
            ...config,
            headers: {
                'x-amz-date': date,
                Authorization: authorizationHeader
            },
            retries: 3
        });

        return {
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
