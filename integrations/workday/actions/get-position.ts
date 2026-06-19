import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

const InputSchema = z.object({
    id: z.string().describe('Position_ID. Example: "P-00030"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    position_code: z.string().optional(),
    effective_date: z.string().optional(),
    status: z.string().optional(),
    inactive: z.boolean().optional(),
    job_profile: z.string().optional(),
    location: z.string().optional(),
    worker: z.string().optional()
});

async function getSoapClient(
    type: 'Human_Resources' | 'Staffing',
    connection: { credentials: { type?: string; username?: string; password?: string }; connection_config: Record<string, unknown> }
) {
    const { credentials, connection_config } = connection;

    if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
        throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
    }

    // WSDL from Workday's community site defines all operations and types
    const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/${type}/v${WORKDAY_VERSION}/${type}.wsdl`;
    // Actual requests go to the tenant's host, not the WSDL host
    const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/${type}/v${WORKDAY_VERSION}`;

    const client = await soap.createClientAsync(wsdlUrl, {});
    client.addHttpHeader('Accept-Encoding', 'gzip, deflate'); // required — omitting causes failures on some queries
    client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
    client.setEndpoint(endpointUrl); // override WSDL default endpoint with the actual tenant URL
    return client;
}

interface WorkdayIdObject {
    attributes?: {
        'wd:type'?: string;
    };
    $value?: string;
}

const findId = (ids: WorkdayIdObject | WorkdayIdObject[] | undefined, type: string): string | undefined =>
    (Array.isArray(ids) ? ids : [ids]).find((r) => r?.attributes?.['wd:type'] === type)?.$value;

interface PositionEntry {
    Position_Reference?: {
        ID?: WorkdayIdObject | WorkdayIdObject[];
    };
    Position_Data?: {
        Effective_Date?: string;
        Closed?: boolean | string;
        Position_Definition_Data?: {
            Position_ID?: string;
            Job_Posting_Title?: string;
        };
        Position_Status_Reference?: Array<{ ID?: WorkdayIdObject | WorkdayIdObject[] }>;
        Job_Profile_Reference?: { ID?: WorkdayIdObject | WorkdayIdObject[] };
        Location_Reference?: { ID?: WorkdayIdObject | WorkdayIdObject[] };
        Worker_Reference?: { ID?: WorkdayIdObject | WorkdayIdObject[] };
    };
}

interface PositionResponse {
    Response_Data?: {
        Position?: PositionEntry | PositionEntry[];
    };
}

const action = createAction({
    description: 'Retrieve a single position from Workday.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const { credentials, connection_config } = connection;

        if (
            !credentials ||
            credentials.type !== 'BASIC' ||
            !credentials.username ||
            !credentials.password ||
            !connection_config ||
            !connection_config['hostname'] ||
            !connection_config['tenant']
        ) {
            throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
        }

        const client = await getSoapClient('Staffing', connection);

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Staffing/v44.0/Get_Positions.html
        const [res]: [PositionResponse, string] = await client['Get_PositionsAsync']({
            Request_References: {
                Position_Reference: {
                    ID: {
                        attributes: { 'wd:type': 'Position_ID' },
                        $value: input.id
                    }
                }
            }
        });

        const rawPositions = res?.Response_Data?.Position;
        const positions = Array.isArray(rawPositions) ? rawPositions : rawPositions ? [rawPositions] : [];
        const position = positions[0];

        if (!position) {
            throw new nango.ActionError({ type: 'not_found', message: `Position not found: ${input.id}` });
        }

        const data = position.Position_Data;
        const definitionData = data?.Position_Definition_Data;

        // Extract status from Position_Status_Reference array
        const statusRef = data?.Position_Status_Reference?.[0];

        const status = findId(statusRef?.ID, 'Position_Status_ID');
        const jobProfile = findId(data?.Job_Profile_Reference?.ID, 'Job_Profile_ID');
        const location = findId(data?.Location_Reference?.ID, 'Location_ID');
        const worker = findId(data?.Worker_Reference?.ID, 'Worker_ID') ?? findId(data?.Worker_Reference?.ID, 'Contingent_Worker_ID');

        return {
            id: findId(position.Position_Reference?.ID, 'Position_ID') ?? input.id,
            name: definitionData?.Job_Posting_Title ?? '',
            position_code: definitionData?.Position_ID ?? findId(position.Position_Reference?.ID, 'Position_ID'),
            effective_date: data?.Effective_Date ? String(data.Effective_Date) : undefined,
            ...(status !== undefined && { status }),
            inactive: data?.Closed === true || data?.Closed === '1',
            ...(jobProfile !== undefined && { job_profile: jobProfile }),
            ...(location !== undefined && { location }),
            ...(worker !== undefined && { worker })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
