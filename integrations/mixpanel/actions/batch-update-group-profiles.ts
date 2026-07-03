import { z } from 'zod';
import { createAction } from 'nango';

const GroupUpdateSchema = z
    .object({
        token: z.string().describe('Project token. Example: "YOUR_PROJECT_TOKEN"').optional(),
        group_key: z.string().describe('Group key. Example: "Company"'),
        group_id: z.string().describe('Group ID. Example: "Mixpanel"'),
        set: z.record(z.string(), z.unknown()).describe('Properties to set or update').optional(),
        set_once: z.record(z.string(), z.unknown()).describe('Properties to set only if they do not exist yet').optional(),
        add: z.record(z.string(), z.unknown()).describe('Properties to increment').optional(),
        union: z.record(z.string(), z.array(z.unknown())).describe('Properties to union with a list').optional(),
        remove: z.record(z.string(), z.array(z.unknown())).describe('Properties to remove values from a list').optional(),
        unset: z.array(z.string()).describe('Properties to remove from the profile').optional(),
        delete: z.boolean().describe('Delete the group profile').optional()
    })
    .refine(
        (data) => {
            let count = 0;
            if (data.set !== undefined) count++;
            if (data.set_once !== undefined) count++;
            if (data.add !== undefined) count++;
            if (data.union !== undefined) count++;
            if (data.remove !== undefined) count++;
            if (data.unset !== undefined) count++;
            if (data.delete !== undefined) count++;
            return count === 1;
        },
        {
            message: 'Exactly one operation must be provided per update object'
        }
    );

const InputSchema = z.object({
    updates: z.array(GroupUpdateSchema).describe('Array of group profile update objects'),
    ip: z.number().describe('Set to 0 to disable geolocation parsing using the request IP').optional(),
    strict: z.number().describe('Set to 1 to return validation errors for invalid updates').optional(),
    verbose: z.number().describe('Set to 1 for a verbose JSON response').optional()
});

const ProviderResponseSchema = z.object({
    status: z.number().optional(),
    error: z.string().nullable().optional()
});

const OutputSchema = z.object({
    status: z.number().describe('1 on success, 0 on failure'),
    error: z.string().nullable().optional().describe('Error message if the request was not successful')
});

const MetadataSchema = z.object({
    region: z.string().describe('Data residency region. Examples: "api", "api-eu", "api-in"').optional()
});

const action = createAction({
    description: 'Batch update group profiles',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    metadata: MetadataSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const metadataResult = MetadataSchema.safeParse(await nango.getMetadata());
        const region = metadataResult.success ? (metadataResult.data.region ?? 'api') : 'api';
        const baseUrl = `https://${region}.mixpanel.com`;

        const body = input.updates.map((update) => {
            const result: Record<string, unknown> = {
                ...(update.token !== undefined && { $token: update.token }),
                $group_key: update.group_key,
                $group_id: update.group_id
            };

            if (update.set !== undefined) {
                result['$set'] = update.set;
            } else if (update.set_once !== undefined) {
                result['$set_once'] = update.set_once;
            } else if (update.add !== undefined) {
                result['$add'] = update.add;
            } else if (update.union !== undefined) {
                result['$union'] = update.union;
            } else if (update.remove !== undefined) {
                result['$remove'] = update.remove;
            } else if (update.unset !== undefined) {
                result['$unset'] = update.unset;
            } else if (update.delete !== undefined) {
                result['$delete'] = update.delete;
            }

            return result;
        });

        const response = await nango.post({
            // https://developer.mixpanel.com/reference/group-batch-update
            endpoint: '/groups',
            baseUrlOverride: baseUrl,
            data: body,
            params: {
                ...(input.ip !== undefined && { ip: String(input.ip) }),
                ...(input.strict !== undefined && { strict: String(input.strict) }),
                ...(input.verbose !== undefined && { verbose: String(input.verbose) })
            },
            retries: 3
        });

        if (typeof response.data === 'string') {
            const parsed = Number(response.data);
            if (Number.isNaN(parsed)) {
                throw new nango.ActionError({
                    type: 'invalid_response',
                    message: 'Received an unexpected non-numeric response from the Mixpanel API',
                    response: response.data
                });
            }

            return {
                status: parsed
            };
        }

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            status: providerResponse.status ?? 1,
            ...(providerResponse.error !== undefined && { error: providerResponse.error })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
