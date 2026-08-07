import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('Display name for the service account. Example: "CI/CD Bot"'),
    email: z.string().describe('Email address for the service account. Example: "ci-bot@example.com"'),
    title: z.string().optional().describe('Optional job title. Example: "Automation Service"')
});

const ProviderResponseSchema = z.object({
    data: z.object({
        id: z.string(),
        type: z.string(),
        attributes: z
            .object({
                name: z.string().nullable().optional(),
                email: z.string().nullable().optional(),
                title: z.string().nullable().optional(),
                disabled: z.boolean().nullable().optional(),
                status: z.string().nullable().optional(),
                service_account: z.boolean().nullable().optional()
            })
            .passthrough()
    })
});

const OutputSchema = z.object({
    id: z.string(),
    type: z.string(),
    name: z.string().optional(),
    email: z.string().optional(),
    title: z.string().optional(),
    disabled: z.boolean().optional(),
    status: z.string().optional(),
    service_account: z.boolean().optional()
});

const action = createAction({
    description: 'Create a new service account (a non-human user identity for machine-to-machine API access).',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://docs.datadoghq.com/api/latest/service-accounts/
            endpoint: 'v2/service_accounts',
            data: {
                data: {
                    type: 'users',
                    attributes: {
                        name: input.name,
                        email: input.email,
                        service_account: true,
                        ...(input.title !== undefined && { title: input.title })
                    }
                }
            },
            retries: 3
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        const user = providerResponse.data;

        return {
            id: user.id,
            type: user.type,
            ...(user.attributes.name != null && { name: user.attributes.name }),
            ...(user.attributes.email != null && { email: user.attributes.email }),
            ...(user.attributes.title != null && { title: user.attributes.title }),
            ...(user.attributes.disabled != null && { disabled: user.attributes.disabled }),
            ...(user.attributes.status != null && { status: user.attributes.status }),
            ...(user.attributes.service_account != null && { service_account: user.attributes.service_account })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
