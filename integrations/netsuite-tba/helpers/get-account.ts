import type { NangoSync } from '../../models';

interface NetSuiteAccount {
    accountId: string;
}
export async function getAccount(nango: NangoSync): Promise<NetSuiteAccount> {
    const connection = await nango.getConnection();

    if ('accountId' in connection.connection_config) {
        const accountId = connection.connection_config['accountId'];
        return { accountId };
    } else {
        throw new nango.ActionError({
            message: `Netsuite connection configuration (accountId) is incomplete`
        });
    }
}
