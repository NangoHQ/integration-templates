import { z } from 'zod';
import { createAction } from 'nango';

const EmailInputSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const PhoneInputSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const InputSchema = z.object({
    name: z.string().describe('The name of the person'),
    owner_id: z.number().optional().describe('The ID of the user who owns the person'),
    org_id: z.number().optional().describe('The ID of the organization linked to the person'),
    email: z.array(EmailInputSchema).optional().describe('The emails of the person'),
    phone: z.array(PhoneInputSchema).optional().describe('The phones of the person'),
    visible_to: z.number().optional().describe('The visibility of the person'),
    marketing_status: z.string().optional().describe('The marketing status of the person')
});

const EmailOutputSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const PhoneOutputSchema = z.object({
    value: z.string(),
    primary: z.boolean().optional(),
    label: z.string().optional()
});

const OutputSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.array(EmailOutputSchema).optional(),
    phone: z.array(PhoneOutputSchema).optional(),
    owner_id: z.number().optional(),
    org_id: z.number().optional(),
    visible_to: z.union([z.number(), z.string()]).optional(),
    marketing_status: z.string().optional()
});

const ProviderPersonSchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    email: z.array(EmailOutputSchema).nullable().optional(),
    phone: z.array(PhoneOutputSchema).nullable().optional(),
    owner_id: z
        .union([z.number(), z.object({ id: z.number() }).passthrough()])
        .nullable()
        .optional(),
    org_id: z
        .union([z.number(), z.object({ value: z.number() }).passthrough()])
        .nullable()
        .optional(),
    visible_to: z.union([z.number(), z.string()]).optional(),
    marketing_status: z.string().nullable().optional()
});

const ProviderResponseSchema = z.object({
    success: z.boolean(),
    data: ProviderPersonSchema
});

const action = createAction({
    description: 'Create a person in Pipedrive.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-person',
        group: 'Persons'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['deals:full', 'contacts:full'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://developers.pipedrive.com/docs/api/v1/Persons#addPerson
            endpoint: '/v1/persons',
            data: {
                name: input.name,
                ...(input.owner_id !== undefined && { owner_id: input.owner_id }),
                ...(input.org_id !== undefined && { org_id: input.org_id }),
                ...(input.email !== undefined && { email: input.email }),
                ...(input.phone !== undefined && { phone: input.phone }),
                ...(input.visible_to !== undefined && { visible_to: input.visible_to }),
                ...(input.marketing_status !== undefined && { marketing_status: input.marketing_status })
            },
            retries: 10
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);
        if (!providerResponse.success) {
            throw new nango.ActionError({
                type: 'provider_error',
                message: 'Pipedrive returned an unsuccessful response'
            });
        }

        const person = providerResponse.data;

        const ownerId =
            person.owner_id !== null && person.owner_id !== undefined
                ? typeof person.owner_id === 'number'
                    ? person.owner_id
                    : person.owner_id.id
                : undefined;
        const orgId =
            person.org_id !== null && person.org_id !== undefined ? (typeof person.org_id === 'number' ? person.org_id : person.org_id.value) : undefined;

        return {
            id: person.id,
            ...(person.name !== undefined && { name: person.name }),
            ...(person.email !== null && person.email !== undefined && { email: person.email }),
            ...(person.phone !== null && person.phone !== undefined && { phone: person.phone }),
            ...(ownerId !== undefined && { owner_id: ownerId }),
            ...(orgId !== undefined && { org_id: orgId }),
            ...(person.visible_to !== undefined && { visible_to: person.visible_to }),
            ...(person.marketing_status !== null && person.marketing_status !== undefined && { marketing_status: person.marketing_status })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
