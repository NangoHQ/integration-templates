import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        account_id: z.string().describe('Timely account ID. Retrieve it from the list-accounts action. Example: "1145787".'),
        name: z.string().describe('Name of the client (company) to create. Example: "Acme Corp".')
    })
    .describe('Input for creating a new Timely client (company).');

const ClientSchema = z
    .object({
        id: z.number().describe('Unique identifier of the client. Example: 2193170.'),
        name: z.string().describe('Name of the client. Example: "Acme Corp".'),
        color: z.string().describe('Auto-assigned hex color used to represent the client in Timely. Example: "0D66D0".'),
        active: z.boolean().describe('Whether the client is active.'),
        external_id: z.string().nullable().optional().describe('External identifier for the client, or null when none is set.'),
        updated_at: z.string().describe('ISO 8601 timestamp (with timezone offset) when the client was last changed.')
    })
    .describe('A newly created Timely client (company).');

/**
 * @tags: [write]
 * @tagReason: Creates a new client (company) in the connected Timely account.
 * @pitfalls: Client names must be unique within the account; creating one whose name already exists fails with a 422 error that includes a suggested_name. Created clients cannot be deleted through the API (only deactivated), so creation is effectively permanent.
 */
const action = createAction({
    description: 'Create a new client (company) in Timely.',
    version: '1.0.0',
    input: InputSchema,
    output: ClientSchema,
    scopes: ['manage'],

    exec: async (nango, input): Promise<z.infer<typeof ClientSchema>> => {
        const response = await nango.post({
            // https://developer.timely.com/
            endpoint: `/1.1/${encodeURIComponent(input.account_id)}/clients`,
            data: {
                client: {
                    name: input.name
                }
            },
            // Creating a client is not idempotent; a retry after a lost response would create a duplicate.
            // eslint-disable-next-line @nangohq/custom-integrations-linting/proxy-call-retries
            retries: 0
        });

        return ClientSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
