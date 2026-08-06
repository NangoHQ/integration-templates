import { z } from 'zod';
import { createAction } from 'nango';

const maybeStr = z.string().nullable().optional();
const maybeNum = z.number().nullable().optional();
const maybeBool = z.boolean().nullable().optional();

const OwnerSchema = z
    .object({
        id: z.number(),
        full_name: maybeStr
    })
    .passthrough();

const TagSchema = z
    .object({
        id: z.number(),
        name: maybeStr
    })
    .passthrough();

const CustomerSchema = z
    .object({
        id: z.number(),
        company_id: maybeNum,
        health_score: maybeStr,
        health_score_description: maybeStr,
        days_in_health: maybeNum,
        owner: OwnerSchema.nullable().optional(),
        created_at: maybeStr,
        updated_at: maybeStr
    })
    .passthrough();

const CompanySchema = z
    .object({
        id: z.number(),
        name: maybeStr,
        description: maybeStr,
        email: maybeStr,
        web: maybeStr,
        fax: maybeStr,
        custom_fields: z.record(z.string(), z.unknown()).nullable().optional(),
        image_thumb_url: maybeStr,
        address_1: maybeStr,
        address_2: maybeStr,
        city: maybeStr,
        state: maybeStr,
        postal_code: maybeStr,
        country: maybeStr,
        facebook_url: maybeStr,
        linked_in_url: maybeStr,
        twitter: maybeStr,
        instant_message: maybeStr,
        phone1: maybeStr,
        phone2: maybeStr,
        phone3: maybeStr,
        phone4: maybeStr,
        phone1_desc: maybeStr,
        phone2_desc: maybeStr,
        phone3_desc: maybeStr,
        phone4_desc: maybeStr,
        owner_id: maybeNum,
        shared_user_ids: z.array(z.number()).nullable().optional(),
        tag_ids: z.array(z.number()).nullable().optional(),
        image_mobile_url: maybeStr,
        possible_notify_user_ids: z.array(z.number()).nullable().optional(),
        owner: OwnerSchema.nullable().optional(),
        next_task_name: maybeStr,
        next_task_id: maybeNum,
        next_task_due: maybeStr,
        next_task_all_day: maybeBool,
        tags: z.array(TagSchema).nullable().optional(),
        customer: CustomerSchema.nullable().optional(),
        created_at: maybeStr,
        updated_at: maybeStr
    })
    .passthrough();

const InputSchema = z.object({
    company_id: z.number().describe('Company ID. Example: 138551860')
});

const OutputSchema = CompanySchema;

const action = createAction({
    description: 'Get a single company by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://app.pipelinecrm.com/api/docs/introduction
            endpoint: `/api/v3/companies/${encodeURIComponent(String(input.company_id))}`,
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Company not found',
                company_id: input.company_id
            });
        }

        const company = CompanySchema.parse(response.data);
        return company;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
