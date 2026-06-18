import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

const InputSchema = z.object({
    id: z.string().describe('Location_ID. Example: "San_Francisco_Site"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    location_code: z.string().optional(),
    location_usage: z.string().optional(),
    inactive: z.boolean()
});

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: any) {
    const { credentials, connection_config } = connection;

    if (
        credentials?.type !== 'BASIC' ||
        !credentials?.username ||
        !credentials?.password ||
        !connection_config?.['hostname'] ||
        !connection_config?.['tenant']
    ) {
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

const findId = (ids: any, type: string): string | undefined => (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

const action = createAction({
    description: 'Retrieve a single location from Workday.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();

        const client = await getSoapClient('Human_Resources', connection);

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Locations.html
        const [res]: [any, string] = await client['Get_LocationsAsync']({
            Request_References: {
                Location_Reference: {
                    ID: {
                        attributes: { 'wd:type': 'Location_ID' },
                        $value: input.id
                    }
                }
            }
        });

        const rawLocation = res?.Response_Data?.Location;
        const location = Array.isArray(rawLocation) ? rawLocation[0] : rawLocation;
        if (!location) {
            throw new nango.ActionError({
                type: 'not_found',
                message: `Location not found: ${input.id}`
            });
        }

        const data = location.Location_Data;

        return {
            id: findId(location.Location_Reference?.ID, 'Location_ID') ?? input.id,
            name: data?.Name ?? '',
            location_code: data?.Location_Code ?? undefined,
            location_usage: findId(data?.Location_Usage_Reference?.ID, 'Location_Usage_ID'),
            inactive: data?.Inactive === '1' || data?.Inactive === true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
