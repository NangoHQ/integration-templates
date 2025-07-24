import type { NangoSync, NangoAction } from "nango";

const BASE_URL = 'https://3.basecampapi.com';

export async function validateAccountIdAndRetrieveBaseUrl(nango: NangoSync | NangoAction): Promise<string | null> {
    const connection = await nango.getConnection();

    const { connection_config, metadata } = connection;

    if (!connection_config['accountId'] && (!metadata || !metadata['accountId'])) {
        const accountIds = Array.isArray(connection_config['accounts']) ? connection_config['accounts']?.map((account) => account && account.id) : [];
        const message =
            accountIds && Array.isArray(accountIds) && accountIds.length > 0
                ? `Connection is missing the accountId, please update the metadata with the key: "accountId" with one of the possible accountIds: ${accountIds.join(', ')}`
                : `Connection is missing the accountId value. Please recreate the connection and set the accountId`;
        throw new nango.ActionError({ message });
    }

    if (connection_config['accountId']) {
        return null;
    }

    if (metadata && metadata['accountId']) {
        const accountId: string = metadata['accountId'].toString();
        return `${BASE_URL}/${accountId}`;
    }

    return null;
}
