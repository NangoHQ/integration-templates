import type { NangoSync, NangoAction } from '../../models';

export async function getTenantId(nango: NangoAction | NangoSync) {
    const connection = await nango.getConnection();

    if (connection.connection_config['tenant_id']) {
        return connection.connection_config['tenant_id'];
    }

    const { metadata } = connection;

    if (metadata && metadata['tenantId']) {
        return metadata['tenantId'];
    }

    const connections = await nango.get({
        endpoint: 'connections',
        retries: 10
    });

    if (connections.data.length === 1) {
        return connections.data[0]['tenantId'];
    } else {
        throw new Error('Multiple tenants found. Please use the get-tenants action to set the choosen tenantId in the metadata.');
    }
}
