import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    name: z.string().describe('The name of the Company. Example: "Intercom"'),
    company_id: z.string().describe('The company id you have defined for the company. Example: "625e90fc55ab113b6d92175f"'),
    plan: z.string().optional().describe('The name of the plan you have associated with the company. Example: "Enterprise"'),
    size: z.number().optional().describe('The number of employees in this company. Example: 100'),
    website: z.string().optional().describe('The URL for this company\'s website. Example: "https://www.example.com"'),
    industry: z.string().optional().describe('The industry that this company operates in. Example: "Manufacturing"'),
    custom_attributes: z.record(z.string(), z.unknown()).optional(),
    remote_created_at: z.number().optional().describe('The time the company was created by you (Unix timestamp). Example: 1394531169'),
    monthly_spend: z.number().optional().describe('How much revenue the company generates for your business. Example: 1000')
});

const ProviderPlanSchema = z
    .object({
        type: z.string().optional(),
        id: z.string().optional(),
        name: z.string().optional()
    })
    .optional();

const ProviderCompanySchema = z.object({
    type: z.string(),
    id: z.string(),
    company_id: z.string(),
    name: z.string(),
    app_id: z.string(),
    plan: ProviderPlanSchema,
    remote_created_at: z.number().optional(),
    created_at: z.number(),
    updated_at: z.number(),
    last_request_at: z.number().optional(),
    size: z.number().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    monthly_spend: z.number().optional(),
    session_count: z.number().optional(),
    user_count: z.number().optional(),
    custom_attributes: z.record(z.string(), z.unknown()).optional(),
    tags: z
        .object({
            type: z.string(),
            tags: z.array(z.unknown())
        })
        .optional(),
    segments: z
        .object({
            type: z.string(),
            segments: z.array(z.unknown())
        })
        .optional()
});

const OutputSchema = z.object({
    id: z.string().describe('The Intercom defined id representing the company.'),
    company_id: z.string().describe('The company id you have defined for the company.'),
    name: z.string().describe('The name of the company.'),
    plan: z
        .object({
            id: z.string().optional(),
            name: z.string().optional()
        })
        .optional()
        .describe('The plan associated with the company.'),
    website: z.string().optional().describe('The URL for the company website.'),
    industry: z.string().optional().describe('The industry that the company operates in.'),
    size: z.number().optional().describe('The number of employees in the company.'),
    monthly_spend: z.number().optional().describe('How much revenue the company generates for your business.'),
    custom_attributes: z.record(z.string(), z.unknown()).optional(),
    created_at: z.number().describe('The time the company was added in Intercom (Unix timestamp).'),
    updated_at: z.number().describe('The last time the company was updated (Unix timestamp).')
});

const action = createAction({
    description: 'Create a company in Intercom.',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/create-company',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const requestBody: Record<string, unknown> = {
            name: input.name,
            company_id: input.company_id
        };

        if (input.plan !== undefined) {
            requestBody['plan'] = input.plan;
        }
        if (input.size !== undefined) {
            requestBody['size'] = input.size;
        }
        if (input.website !== undefined) {
            requestBody['website'] = input.website;
        }
        if (input.industry !== undefined) {
            requestBody['industry'] = input.industry;
        }
        if (input.custom_attributes !== undefined) {
            requestBody['custom_attributes'] = input.custom_attributes;
        }
        if (input.remote_created_at !== undefined) {
            requestBody['remote_created_at'] = input.remote_created_at;
        }
        if (input.monthly_spend !== undefined) {
            requestBody['monthly_spend'] = input.monthly_spend;
        }

        // https://developers.intercom.com/docs/references/2.11/rest-api/api.intercom.io/companies/createorupdatecompany
        const response = await nango.post({
            endpoint: '/companies',
            data: requestBody,
            retries: 3,
            headers: {
                'Intercom-Version': '2.11'
            }
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to create company - no response data received'
            });
        }

        const company = ProviderCompanySchema.parse(response.data);

        const planOutput: { id?: string; name?: string } | undefined = company.plan
            ? {
                  ...(company.plan.id !== undefined && { id: company.plan.id }),
                  ...(company.plan.name !== undefined && { name: company.plan.name })
              }
            : undefined;

        return {
            id: company.id,
            company_id: company.company_id,
            name: company.name,
            created_at: company.created_at,
            updated_at: company.updated_at,
            ...(planOutput !== undefined && Object.keys(planOutput).length > 0 && { plan: planOutput }),
            ...(company.website !== undefined && { website: company.website }),
            ...(company.industry !== undefined && { industry: company.industry }),
            ...(company.size !== undefined && { size: company.size }),
            ...(company.monthly_spend !== undefined && { monthly_spend: company.monthly_spend }),
            ...(company.custom_attributes !== undefined &&
                Object.keys(company.custom_attributes).length > 0 && {
                    custom_attributes: company.custom_attributes
                })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
