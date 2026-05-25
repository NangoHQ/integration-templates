import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

// https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Organizations.html
async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: { credentials: any; connection_config: any }) {
    const { credentials, connection_config } = connection;

    if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${WORKDAY_VERSION}/${type}.wsdl`;
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/${type}/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl);
    return client;
}

const InputSchema = z.object({
    cursor: z.string().optional().describe('Pagination cursor (page number). Omit for the first page.')
});

const OrganizationSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    description: z.string().optional(),
    inactive: z.boolean(),
    external_id: z.string().optional()
});

const OutputSchema = z.object({
    items: z.array(OrganizationSchema),
    next_cursor: z.string().optional()
});

const action = createAction({
    description: 'List organizations from Workday.',
    version: '1.0.0',
    endpoint: { method: 'POST', path: '/actions/list-organizations', group: 'Organizations' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const client = await getSoapClient('Human_Resources', connection);

        const findId = (ids: any, type: string): string | undefined =>
            (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

        const pageSize = 100;
        const items: z.infer<typeof OrganizationSchema>[] = [];

        let page = input.cursor ? parseInt(input.cursor, 10) : 1;
        if (isNaN(page) || page < 1) {
            page = 1;
        }

        const [res]: [any, string] = await client['Get_OrganizationsAsync']({
            Response_Filter: {
                Page: page,
                Count: pageSize
            }
        });

        const rawOrganizations = res?.Response_Data?.Organization;
        const organizations = Array.isArray(rawOrganizations) ? rawOrganizations : rawOrganizations ? [rawOrganizations] : [];

        for (const org of organizations) {
            const data = org.Organization_Data;
            if (!data) {
                continue;
            }

            const inactive = data?.Inactive === '1' || data?.Inactive === true;

            items.push({
                id: findId(org.Organization_Reference?.ID, 'Organization_Reference_ID') ?? '',
                name: data?.Name ?? '',
                type: findId(data?.Organization_Type_Reference?.ID, 'Organization_Type_ID'),
                subtype: findId(data?.Organization_Subtype_Reference?.ID, 'Organization_Subtype_ID'),
                description: data?.Description ?? undefined,
                inactive: inactive,
                external_id: data?.External_IDs_Data?.ID?.[0]?.['$value'] ?? undefined
            });
        }

        const responseResults = res?.Response_Results;
        const hasMoreData = responseResults && responseResults.Page < responseResults.Total_Pages;

        const result: z.infer<typeof OutputSchema> = { items };
        if (hasMoreData) {
            result.next_cursor = String(page + 1);
        }
        return result;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
