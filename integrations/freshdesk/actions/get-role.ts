import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z
    .object({
        id: z.number().describe('Unique numeric ID of the role. Example: 1')
    })
    .describe('Input to retrieve a single Freshdesk agent role by ID');

const OutputSchema = z
    .object({
        id: z.number().describe('Unique ID of the role'),
        name: z.string().describe('Name of the role'),
        description: z.string().describe('Description of the role'),
        default: z.boolean().describe('Set to true if this is the default role'),
        created_at: z.string().describe('Role creation timestamp in UTC format'),
        updated_at: z.string().describe('Role updated timestamp in UTC format')
    })
    .describe('Freshdesk agent role resource');

/**
 * @tags: [read]
 * @tagReason: Retrieves a single agent role from Freshdesk.
 */
const action = createAction({
    description: 'Retrieve a single agent role from Freshdesk.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],
    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://developers.freshdesk.com/api/#view_role
            endpoint: `/api/v2/roles/${encodeURIComponent(input.id)}`,
            retries: 3
        };

        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Role not found',
                id: input.id
            });
        }

        const providerRole = z
            .object({
                id: z.number(),
                name: z.string(),
                description: z.string(),
                default: z.boolean(),
                created_at: z.string(),
                updated_at: z.string()
            })
            .parse(response.data);

        return {
            id: providerRole.id,
            name: providerRole.name,
            description: providerRole.description,
            default: providerRole.default,
            created_at: providerRole.created_at,
            updated_at: providerRole.updated_at
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
