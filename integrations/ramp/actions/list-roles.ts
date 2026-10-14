import { z } from 'zod';
import { createAction } from 'nango';

const ProductCapabilitySchema = z.object({
    name: z.string().describe('Name of the product capability. Example: "EXPENSES_VIEW_EXPENSES"'),
    access: z.string().nullable().describe('Access level granted for the capability (e.g. "global"), or null when the capability does not use access levels.'),
    description: z.string().describe('Human-readable description of the product capability.')
});

const RoleSchema = z.object({
    id: z.string().describe('Unique identifier (UUID) of the role.'),
    name: z.string().describe('Display name of the role. Example: "Router Admin"'),
    base_role: z.string().describe('System role this role is based on. Example: "CUSTOM"'),
    description: z.string().nullable().describe('Description of the role, or null when none is set.'),
    product_capabilities: z.array(ProductCapabilitySchema).describe('Product capabilities enabled for the role.')
});

const ProviderRolesSchema = z.object({
    data: z.array(RoleSchema)
});

const InputSchema = z.object({}).describe('No input parameters; lists all roles defined on the connected business.');

const OutputSchema = z
    .object({
        roles: z.array(RoleSchema).describe('Roles defined on the business, each with its permission capabilities.')
    })
    .describe('Roles defined on the connected business.');

/**
 * @tags: [read]
 * @tagReason: Reads the roles defined on the business; makes no changes to provider data.
 * @pitfalls: Only roles exposed by this API are returned (for example custom and Router-product roles), not every built-in Ramp role such as the standard card-program roles assigned on user records; role `description` and capability `access` can be `null`.
 */
const action = createAction({
    description: 'List the custom/base roles defined on the business, with their permission capabilities.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['users:read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/roles
            endpoint: '/developer/v1/roles',
            retries: 3
        });

        const parsed = ProviderRolesSchema.parse(response.data);

        return {
            roles: parsed.data
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
