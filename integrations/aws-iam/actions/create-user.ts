import type { NangoAction, ProxyConfiguration } from '../../models';
import type { CreateUserResponse } from '../types';
import { aWSCreateUserSchema } from '../schema.zod.js';
import { getAWSAuthHeader } from '../helper/utils.js';
import type { User, AWSCreateUser } from '../.nango/schema';

export default async function runAction(nango: NangoAction, input: AWSCreateUser): Promise<User> {
    nango.zodValidateInput({ zodSchema: aWSCreateUserSchema, input });

    const { firstName, lastName, email, userName } = input;

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

    const awsIAMParams = {
        method: 'POST',
        service: 'iam',
        path: '/',
        params: {
            Action: 'CreateUser',
            Version: '2010-05-08',
            'UserName': userName as string
        }
    };

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
