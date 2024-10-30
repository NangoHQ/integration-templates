import type { NangoSync, ProxyConfiguration } from '../../models';
import { getAWSAuthHeader } from '../helper/utils.js';

export default async function fetchData(nango: NangoSync) {
    const method = 'GET';
    const service = 'iam';
    const path = '/';
    const params = {
        Action: 'ListUsers',
        Version: '2010-05-08'
    };

    const querystring = new URLSearchParams(params).toString();

    const config: ProxyConfiguration = {
        endpoint: '/',
        params
    };

    // Get AWS authorization header
    const { authorizationHeader, date } = await getAWSAuthHeader(nango, method, service, path, querystring);


    // Fetch and save users
}

