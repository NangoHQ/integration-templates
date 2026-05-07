import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    plan: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    size: z.number().int().optional(),
    monthly_spend: z.number().int().optional(),
    remote_created_at: z.number().int().optional(),
    custom_attributes: z.object({}).passthrough().optional()
});

const PlanSchema = z.object({
    type: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional()
});

const TagsSchema = z.object({
    type: z.string().optional(),
    tags: z.array(z.unknown()).optional()
});

const SegmentsSchema = z.object({
    type: z.string().optional(),
    segments: z.array(z.unknown()).optional()
});

const ProviderCompanySchema = z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().nullable().optional(),
    app_id: z.string().optional(),
    company_id: z.string().nullable().optional(),
    plan: PlanSchema.nullable().optional(),
    remote_created_at: z.number().int().nullable().optional(),
    created_at: z.number().int().optional(),
    updated_at: z.number().int().optional(),
    last_request_at: z.number().int().nullable().optional(),
    size: z.number().int().nullable().optional(),
    website: z.string().nullable().optional(),
    industry: z.string().nullable().optional(),
    monthly_spend: z.number().int().nullable().optional(),
    session_count: z.number().int().optional(),
    user_count: z.number().int().optional(),
    custom_attributes: z.object({}).passthrough().nullable().optional(),
    tags: TagsSchema.optional(),
    segments: SegmentsSchema.optional()
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    company_id: z.string().optional(),
    plan: z.string().optional(),
    website: z.string().optional(),
    industry: z.string().optional(),
    size: z.number().int().optional(),
    monthly_spend: z.number().int().optional(),
    custom_attributes: z.object({}).passthrough().optional()
});

const action = createAction({
    description: 'Update mutable fields on an existing company',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-company',
        group: 'Companies'
    },
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const updateData: Record<string, unknown> = {};

        if (input.name !== undefined) {
            updateData['name'] = input.name;
        }
        if (input.plan !== undefined) {
            updateData['plan'] = input.plan;
        }
        if (input.website !== undefined) {
            updateData['website'] = input.website;
        }
        if (input.industry !== undefined) {
            updateData['industry'] = input.industry;
        }
        if (input.size !== undefined) {
            updateData['size'] = input.size;
        }
        if (input.monthly_spend !== undefined) {
            updateData['monthly_spend'] = input.monthly_spend;
        }
        if (input.remote_created_at !== undefined) {
            updateData['remote_created_at'] = input.remote_created_at;
        }
        if (input.custom_attributes !== undefined) {
            updateData['custom_attributes'] = input.custom_attributes;
        }

        // https://developers.intercom.com/docs/references/rest-api/api.intercom.io/companies/updatecompany
        const response = await nango.put({
            endpoint: `/companies/${encodeURIComponent(input.id)}`,
            data: updateData,
            retries: 3
        });

        const providerCompany = ProviderCompanySchema.parse(response.data);

        const output: z.infer<typeof OutputSchema> = {
            id: providerCompany.id
        };

        if (providerCompany.name != null) {
            output.name = providerCompany.name;
        }
        if (providerCompany.company_id != null) {
            output.company_id = providerCompany.company_id;
        }
        if (providerCompany.plan?.name != null) {
            output.plan = providerCompany.plan.name;
        }
        if (providerCompany.website != null) {
            output.website = providerCompany.website;
        }
        if (providerCompany.industry != null) {
            output.industry = providerCompany.industry;
        }
        if (providerCompany.size != null) {
            output.size = providerCompany.size;
        }
        if (providerCompany.monthly_spend != null) {
            output.monthly_spend = providerCompany.monthly_spend;
        }
        if (providerCompany.custom_attributes != null) {
            output.custom_attributes = providerCompany.custom_attributes;
        }

        return output;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
