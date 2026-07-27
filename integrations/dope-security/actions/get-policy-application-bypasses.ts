import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    policyName: z.string().describe('Policy name. Example: "RegistrySeedPolicy1"')
});

const CustomApplicationEntrySchema = z.object({
    name: z.string(),
    note: z.string().optional(),
    updatedBy: z.string().optional(),
    updatedAt: z.string().optional()
});

const DefaultApplicationEntrySchema = z.object({
    name: z.string(),
    state: z.enum(['applied', 'ignored'])
});

const CustomPlatformApplicationsSchema = z.object({
    mac: z.array(CustomApplicationEntrySchema).optional(),
    windows: z.array(CustomApplicationEntrySchema).optional()
});

const DefaultPlatformApplicationsSchema = z.object({
    mac: z.array(DefaultApplicationEntrySchema).optional(),
    windows: z.array(DefaultApplicationEntrySchema).optional()
});

const ProviderResponseSchema = z.object({
    data: z.object({
        inheritsFromBase: z.boolean(),
        custom: CustomPlatformApplicationsSchema.optional(),
        default: DefaultPlatformApplicationsSchema.optional()
    })
});

const OutputSchema = z.object({
    inheritsFromBase: z.boolean(),
    custom: CustomPlatformApplicationsSchema.optional(),
    default: DefaultPlatformApplicationsSchema.optional()
});

const action = createAction({
    description: "Fetch a policy's application bypass entries, split by platform (mac/windows).",
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const encodedPolicyName = encodeURIComponent(input.policyName);

        // https://inflight.dope.security/dope.apis/public-api-specification
        const response = await nango.get({
            endpoint: `/v1/policies/${encodedPolicyName}/bypass/applications`,
            retries: 3
        });

        const parsed = ProviderResponseSchema.parse(response.data);

        return {
            inheritsFromBase: parsed.data.inheritsFromBase,
            ...(parsed.data.custom !== undefined && { custom: parsed.data.custom }),
            ...(parsed.data.default !== undefined && { default: parsed.data.default })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
