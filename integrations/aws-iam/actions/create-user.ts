import type { NangoAction, User, AWSCreateUser, ActionResponseError, ProxyConfiguration } from '../../models';
import type { AWSIAMRequestParams, CreateUserResponse } from '../types';
import { aWSCreateUserSchema } from '../schema.zod.js';
import { getAWSAuthHeader } from '../helper/utils.js';

export default async function runAction(nango: NangoAction, input: AWSCreateUser): Promise<User> {
    const parsedInput = aWSCreateUserSchema.safeParse(input);

    if (!parsedInput.success) {
        for (const error of parsedInput.error.errors) {
            await nango.log(`Invalid input provided to create a user: ${error.message} at path ${error.path.join('.')}`, { level: 'error' });
        }
        throw new nango.ActionError<ActionResponseError>({
            message: 'Invalid input provided to create a user'
        });
    }

    const { firstName, lastName, email } = parsedInput.data;

    const awsIAMParams: AWSIAMRequestParams = {
        method: 'POST',
        service: 'iam',
        path: '/',
        params: {
            Action: 'CreateUser',
            UserName: parsedInput.data.userName || `${firstName}.${lastName}`,
            Version: '2010-05-08'
        }
    };

    const tags = [
        { Key: 'firstName', Value: firstName },
        { Key: 'lastName', Value: lastName },
        { Key: 'email', Value: email }
    ];
    const tagsParams = new URLSearchParams();
    tags.forEach((tag, index) => {
        tagsParams.append(`Tags.member.${index + 1}.Key`, tag.Key);
        tagsParams.append(`Tags.member.${index + 1}.Value`, tag.Value);
    });

    const queryParams = new URLSearchParams({
        ...awsIAMParams.params
    });

    tagsParams.forEach((value, key) => {
        queryParams.append(key, value);
    });

    // Sort and construct query string
    const sortedQueryParams = new URLSearchParams(Array.from(queryParams.entries()).sort(([keyA], [keyB]) => keyA.localeCompare(keyB)));

    const paramsObject = Object.fromEntries(sortedQueryParams.entries());

    // Get AWS authorization header
    const { authorizationHeader, date } = await getAWSAuthHeader(
        nango,
        awsIAMParams.method,
        awsIAMParams.service,
        awsIAMParams.path,
        sortedQueryParams.toString()
    );

    const config: ProxyConfiguration = {
        // https://docs.aws.amazon.com/IAM/latest/APIReference/API_CreateUser.html
        endpoint: awsIAMParams.path,
        params: paramsObject,
        retries: 10
    };

    // Make the Create User request
    const resp = await nango.post({
        ...config,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-amz-date': date,
            Authorization: authorizationHeader
        },
        retries: 10
    });

    return mapCreateUserResponse(resp.data.CreateUserResponse);
}

function mapCreateUserResponse(response: CreateUserResponse): User {
    const user = response.CreateUserResult?.User;
    const tags = user.Tags || [];

    // Map tags to variables
    const firstName = tags.find((tag) => tag.Key === 'firstName')?.Value || '';
    const lastName = tags.find((tag) => tag.Key === 'lastName')?.Value || '';
    const email = tags.find((tag) => tag.Key === 'email')?.Value || '';

    return {
        id: user.UserId,
        firstName,
        lastName,
        email
    };
}
