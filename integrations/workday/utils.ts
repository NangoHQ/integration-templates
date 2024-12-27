import soap from 'soap';
import type { NangoSync } from '../models';

const version = '42.0';

export async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: Awaited<ReturnType<NangoSync['getConnection']>>) {
    if (connection.credentials.type !== 'BASIC' || !connection.credentials.password || !connection.credentials.username) {
        throw new Error('invalid_credentials');
    }

    // Create SOAP client
    const client = await soap.createClientAsync(
        `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${version}/${type}.wsdl`,
        {}
    );
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate'); // Needed or some queries will fail https://github.com/axios/axios/issues/4806

    client.setSecurity(new soap.WSSecurity(connection.credentials.username, connection.credentials.password));

    // Each customers has its own endpoint
    // TODO: parametrize that
    client.setEndpoint(`https://impl-services1.wd12.myworkday.com/ccx/service/activecybersrv_dpt2/${type}/v${version}`);

    return client;
}
