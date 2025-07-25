import soap from 'soap';
import type { NangoSync } from '../models.js';

const version = '44.0';

export async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: Awaited<ReturnType<NangoSync['getConnection']>>) {
    const { credentials, connection_config } = connection;

    if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    // Create SOAP client
    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${version}/${type}.wsdl`;
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/${type}/v${version}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate'); // Needed or some queries will fail https://github.com/axios/axios/issues/4806

    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl);

    return client;
}
