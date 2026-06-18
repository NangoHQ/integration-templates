import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    companyId: z.string().describe('The ID of the company to be updated. Example: "gid://shopify/Company/1234567890"'),
    name: z.string().optional().describe('The name of the company.'),
    note: z.string().nullable().optional().describe('A note about the company. Pass null to clear.'),
    externalId: z.string().nullable().optional().describe('A unique externally-supplied ID for the company. Pass null to clear.'),
    customerSince: z
        .string()
        .nullable()
        .optional()
        .describe('The date and time (ISO 8601 format) at which the company became the customer. Pass null to clear.')
});

const CompanySchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.string(),
    customerSince: z.string(),
    externalId: z.string().nullable(),
    note: z.string().nullable(),
    updatedAt: z.string()
});

const UserErrorSchema = z.object({
    code: z.string().nullable(),
    field: z.array(z.string()).nullable(),
    message: z.string()
});

const OutputSchema = z.object({
    company: CompanySchema.optional(),
    userErrors: z.array(UserErrorSchema)
});

const action = createAction({
    description: 'Update a Shopify B2B company.',
    version: '1.0.1',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write_companies'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation companyUpdate($companyId: ID!, $input: CompanyInput!) {
                companyUpdate(companyId: $companyId, input: $input) {
                    company {
                        id
                        name
                        createdAt
                        customerSince
                        externalId
                        note
                        updatedAt
                    }
                    userErrors {
                        code
                        field
                        message
                    }
                }
            }
        `;

        const variables = {
            companyId: input.companyId,
            input: {
                ...(input.name !== undefined && { name: input.name }),
                ...(input.note !== undefined && { note: input.note }),
                ...(input.externalId !== undefined && { externalId: input.externalId }),
                ...(input.customerSince !== undefined && { customerSince: input.customerSince })
            }
        };

        const response = await nango.post({
            // https://shopify.dev/docs/api/admin-graphql/latest/mutations/companyUpdate
            endpoint: '/admin/api/2026-04/graphql.json',
            data: {
                query: mutation,
                variables
            },
            retries: 3
        });

        const payload = z
            .object({
                data: z.object({
                    companyUpdate: z.object({
                        company: CompanySchema.nullable(),
                        userErrors: z.array(UserErrorSchema)
                    })
                })
            })
            .parse(response.data);

        return {
            ...(payload.data.companyUpdate.company != null && {
                company: payload.data.companyUpdate.company
            }),
            userErrors: payload.data.companyUpdate.userErrors
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
