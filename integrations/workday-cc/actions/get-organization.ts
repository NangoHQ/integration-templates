import { z } from 'zod';
import { createAction } from 'nango';

const STAFFING_API_VERSION = 'v6';

const InputSchema = z.object({
    id: z.string().describe('Supervisory organization ID. Example: "SUPERVISORY_ORG-6-9"')
});

// Workday's Staffing REST API only exposes Supervisory Organizations, unlike the SOAP Human
// Resources API which covered every organization type (company, cost center, matrix, etc.).
const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.string().optional(),
    subtype: z.string().optional(),
    description: z.string().optional(),
    external_id: z.string().optional()
});

const ProviderOrganizationSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    code: z.string().optional(),
    inactive: z.boolean().optional()
});

const action = createAction({
    description: 'Retrieve a single supervisory organization from Workday by its ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const connection = await nango.getConnection();
        const tenant = connection.connection_config['tenant'];

        // https://community.workday.com/sites/default/files/file-hosting/restapi/index.html#staffing/v6/supervisoryOrganizations
        const response = await nango.get({
            endpoint: `/staffing/${STAFFING_API_VERSION}/${tenant}/supervisoryOrganizations/${encodeURIComponent(input.id)}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({ type: 'not_found', message: `Organization not found: ${input.id}` });
        }

        const org = ProviderOrganizationSchema.parse(response.data);

        return {
            id: org.id,
            name: org.name ?? '',
            type: 'Supervisory',
            external_id: org.code
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
