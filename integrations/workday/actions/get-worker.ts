import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

interface Connection {
    credentials: {
        type?: string;
        username?: string;
        password?: string;
    };
    connection_config: Record<string, string | undefined>;
}

async function getSoapClient(type: 'Human_Resources' | 'Staffing', connection: Connection) {
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

interface IdReference {
    attributes?: {
        'wd:type'?: string;
    };
    $value?: string;
}

interface WorkerResponse {
    Response_Data?: {
        Worker?: Array<{
            Worker_Reference?: {
                ID?: IdReference | IdReference[];
            };
            Personal_Data?: {
                Name?: Array<{ Formatted_Name?: string }>;
                Email_Address_Data?: Array<{ Email_Address?: string }>;
                User_ID?: string;
            };
            Employment_Data?: Array<{
                Worker_Status_Data?: {
                    Active?: string | boolean;
                };
            }>;
        }>;
    };
}

const InputSchema = z.object({
    id: z.string().describe('Employee_ID. Example: "21001"')
});

const OutputSchema = z.object({
    id: z.string(),
    employee_id: z.string().optional(),
    contingent_worker_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    user_id: z.string().optional(),
    active: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single worker from Workday.',
    version: '1.0.0',
    endpoint: { method: 'GET', path: '/actions/get-worker', group: 'Workers' },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const { credentials, connection_config } = connection;

        if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
            throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
        }

        const client = await getSoapClient('Human_Resources', connection);

        const findId = (ids: IdReference | IdReference[] | undefined, type: string): string | undefined => {
            if (!ids) return undefined;
            const arr = Array.isArray(ids) ? ids : [ids];
            return arr.find((r) => r?.attributes?.['wd:type'] === type)?.$value;
        };

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Workers.html
        const [res]: [WorkerResponse, string] = await client['Get_WorkersAsync']({
            Request_References: {
                Worker_Reference: {
                    ID: {
                        attributes: { 'wd:type': 'Employee_ID' },
                        $value: input.id
                    }
                }
            },
            Response_Group: {
                Include_Personal_Information: true,
                Include_Employment_Information: true
            }
        });

        const worker = res?.Response_Data?.Worker?.[0];
        if (!worker) {
            throw new nango.ActionError({ type: 'not_found', message: `Worker not found: ${input.id}` });
        }

        const personalData = worker?.Personal_Data;
        const employmentData = worker?.Employment_Data?.[0];

        const employeeId = findId(worker.Worker_Reference?.ID, 'Employee_ID');
        const contingentWorkerId = findId(worker.Worker_Reference?.ID, 'Contingent_Worker_ID');

        const formattedName = personalData?.Name?.[0]?.Formatted_Name;
        const emailAddress = personalData?.Email_Address_Data?.[0]?.Email_Address;
        const userId = personalData?.User_ID;

        return {
            id: employeeId ?? contingentWorkerId ?? input.id,
            ...(employeeId !== undefined && { employee_id: employeeId }),
            ...(contingentWorkerId !== undefined && { contingent_worker_id: contingentWorkerId }),
            ...(formattedName !== undefined && formattedName !== '' && { name: formattedName }),
            ...(emailAddress !== undefined && emailAddress !== '' && { email: emailAddress }),
            ...(userId !== undefined && userId !== '' && { user_id: userId }),
            active: employmentData?.Worker_Status_Data?.Active === '1' || employmentData?.Worker_Status_Data?.Active === true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
