import crypto from 'crypto';
import type { NangoSync, NangoAction } from '../../models';

interface AWSAuthHeader {
    authorizationHeader: string;
    date: string;
}

export async function getAWSAuthHeader(
    nango: NangoSync | NangoAction,
    method: string,
    service: string,
    path: string,
    querystring: string
): Promise<AWSAuthHeader> {
    const connection = await nango.getConnection();

    if ('username' in connection.credentials && 'password' in connection.credentials && 'region' in connection.connection_config) {
        const accessKeyId = connection.credentials['username'];
        const secretAccessKey = connection.credentials['password'];
        const region = connection.connection_config['region'];
        const host = 'iam.amazonaws.com';

        const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
        const payloadHash = crypto.createHash('sha256').update('').digest('hex');
        const canonicalHeaders = `host:${host}\nx-amz-date:${date}\n`;
        const signedHeaders = 'host;x-amz-date';

        const canonicalRequest = `${method}\n${path}\n${querystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
        const credentialScope = `${date.substr(0, 8)}/${region}/${service}/aws4_request`;
        const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest).digest('hex')}`;

        const getSignatureKey = (key: string, dateStamp: string, regionName: string, serviceName: string) => {
            const kDate = crypto.createHmac('sha256', `AWS4${key}`).update(dateStamp).digest();
            const kRegion = crypto.createHmac('sha256', kDate).update(regionName).digest();
            const kService = crypto.createHmac('sha256', kRegion).update(serviceName).digest();
            return crypto.createHmac('sha256', kService).update('aws4_request').digest();
        };

        const signingKey = getSignatureKey(secretAccessKey, date.substr(0, 8), region, service);
        const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

        const authorizationHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

        console.log(authorizationHeader)

        return { authorizationHeader, date };
    } else {
        throw new nango.ActionError({
            message: `AWS credentials (username, password, region) are incomplete`
        });
    }
}
