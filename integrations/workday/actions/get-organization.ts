import { z } from 'zod';
import { createAction } from 'nango';
import soap from 'soap';

const WORKDAY_VERSION = '44.0';

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
    for (let attempt = 0; attempt < retries; attempt++) {
        // @allowTryCatch
        try {
            return await fn();
        } catch (err) {
            if (attempt === retries - 1) throw err;
            await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
        }
    }
    throw new Error('unreachable');
}

const InputSchema = z.object({
    id: z.string().describe('Organization_Reference_ID. Example: "HRIS_matrix"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    description: z.string().optional(),
    external_id: z.string().optional()
});

const action = createAction({
    description: 'Retrieve a single organisation from Workday by its reference ID.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const { credentials, connection_config } = connection;

        if (credentials.type !== 'BASIC' || !credentials.username || !credentials.password || !connection_config['hostname'] || !connection_config['tenant']) {
            throw new Error('Invalid credentials: BASIC auth, username, password, hostname, and tenant are all required.');
        }

        const wsdlUrl = `https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v${WORKDAY_VERSION}/Human_Resources.wsdl`;
        const endpointUrl = `https://${connection_config['hostname']}/ccx/service/${connection_config['tenant']}/Human_Resources/v${WORKDAY_VERSION}`;

        const client = await soap.createClientAsync(wsdlUrl, {});
        client.addHttpHeader('Accept-Encoding', 'gzip, deflate');
        client.setSecurity(new soap.WSSecurity(credentials.username, credentials.password));
        client.setEndpoint(endpointUrl);

        const findId = (ids: any, type: string): string | undefined =>
            (Array.isArray(ids) ? ids : [ids]).find((r: any) => r?.attributes?.['wd:type'] === type)?.$value;

        // https://community.workday.com/sites/default/files/file-hosting/productionapi/Human_Resources/v44.0/Get_Organizations.html
        const [res]: [any, string] = await withRetry(() =>
            client['Get_OrganizationsAsync']({
                Request_References: {
                    Organization_Reference: {
                        ID: {
                            attributes: { 'wd:type': 'Organization_Reference_ID' },
                            $value: input.id
                        }
                    }
                }
            })
        );

        const org = res?.Response_Data?.Organization?.[0];
        if (!org) {
            throw new nango.ActionError({ type: 'not_found', message: `Organization not found: ${input.id}` });
        }

        const data = org.Organization_Data;

        return {
            id: findId(org.Organization_Reference?.ID, 'Organization_Reference_ID') ?? input.id,
            name: data?.Name ?? '',
            type: findId(data?.Organization_Type_Reference?.ID, 'Organization_Type_ID'),
            subtype: findId(data?.Organization_Subtype_Reference?.ID, 'Organization_Subtype_ID'),
            description: data?.Description ?? undefined,
            external_id: data?.External_IDs_Data?.ID?.[0]?.['$value'] ?? undefined
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
