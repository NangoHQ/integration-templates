import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({});

const SchemaStubSchema = z.object({
    schemaId: z.string(),
    displayName: z.string(),
    latestSchemaVersion: z.string(),
    maturity: z.string().nullable().optional(),
    multiObject: z.boolean().nullable().optional(),
    ordered: z.boolean().nullable().optional(),
    ownerBasedAccessControl: z.boolean().nullable().optional()
});

const OutputSchema = z.object({
    items: z.array(SchemaStubSchema),
    totalCount: z.number()
});

const action = createAction({
    description: 'List available Settings 2.0 schema IDs',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['settings.read'],

    exec: async (nango, _input): Promise<z.infer<typeof OutputSchema>> => {
        // https://docs.dynatrace.com/docs/dynatrace-api/environment-api/settings/schemas/get-all
        const response = await nango.get({
            endpoint: '/api/v2/settings/schemas',
            retries: 3
        });

        const raw = response.data;

        const providerSchema = z.object({
            items: z.array(SchemaStubSchema.passthrough()),
            totalCount: z.number()
        });

        const parsed = providerSchema.parse(raw);

        return {
            items: parsed.items.map((item) => ({
                schemaId: item.schemaId,
                displayName: item.displayName,
                latestSchemaVersion: item.latestSchemaVersion,
                ...(item.maturity !== undefined && { maturity: item.maturity }),
                ...(item.multiObject !== undefined && { multiObject: item.multiObject }),
                ...(item.ordered !== undefined && { ordered: item.ordered }),
                ...(item.ownerBasedAccessControl !== undefined && { ownerBasedAccessControl: item.ownerBasedAccessControl })
            })),
            totalCount: parsed.totalCount
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
