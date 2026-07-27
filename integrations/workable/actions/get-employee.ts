import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Employee ID. Example: "19ff54"'),
    member_id: z.string().describe('Admin member ID required for account tokens. Example: "1f395d"')
});

const CountrySchema = z
    .object({
        display: z.string().optional(),
        value: z.string().optional()
    })
    .passthrough();

const AddressSchema = z
    .object({
        id: z.string().optional(),
        city: z.string().optional(),
        bounds: z
            .object({
                northeast: z.string().optional(),
                southwest: z.string().optional()
            })
            .passthrough()
            .optional(),
        coords: z.string().optional(),
        status: z.string().optional(),
        country: z.string().optional(),
        zip_code: z.string().optional(),
        state_code: z.string().optional(),
        subregion: z.string().optional(),
        street_name: z.string().optional(),
        country_code: z.string().optional(),
        street_number: z.string().optional(),
        location_string: z.string().optional()
    })
    .passthrough();

const PhoneGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                phone_type: z.string().optional(),
                phone: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const EmailGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z.string().optional()
    })
    .passthrough();

const ChatGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                chat_type: z.string().optional(),
                chat_username: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const SocialGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                social_type: z.string().optional(),
                social_url: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const DirectReportSchema = z
    .object({
        id: z.string().optional(),
        name: z.string().optional(),
        job_title: z.string().optional(),
        avatar: z.string().optional(),
        state: z.string().optional()
    })
    .passthrough();

const EmploymentGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                employment_effective_date: z.string().optional(),
                employment_status: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const SalaryPayRateSchema = z
    .object({
        amount: z.number().optional(),
        currency: z.string().optional(),
        frequency: z.string().optional()
    })
    .passthrough();

const SalaryGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                salary_effective_date: z.string().optional(),
                salary_pay_type: z.string().optional(),
                salary_pay_rate: SalaryPayRateSchema.optional(),
                salary_pay_schedule: z.string().optional(),
                salary_overtime_status: z.string().optional(),
                salary_justification: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const BankDetailsGroupSchema = z
    .object({
        bank_details_bank_name: z.string().optional(),
        bank_details_iban: z.string().optional(),
        bank_details_account_number: z.string().optional()
    })
    .passthrough();

const SsnGroupSchema = z
    .object({
        social_security_number_number: z.string().optional(),
        social_security_number_issue_date: z.string().optional()
    })
    .passthrough();

const NinGroupSchema = z
    .object({
        national_identification_number_number: z.string().optional(),
        national_identification_number_issue_date: z.string().optional()
    })
    .passthrough();

const SinGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                social_insurance_number_number: z.string().optional(),
                social_insurance_number_issue_date: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const TaxIdGroupSchema = z
    .object({
        tax_identification_number_number: z.string().optional(),
        tax_identification_number_issue_date: z.string().optional()
    })
    .passthrough();

const CitizenshipItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: CountrySchema.optional()
    })
    .passthrough();

const PassportGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                passport_country: CountrySchema.optional(),
                passport_number: z.string().optional(),
                passport_issue_date: z.string().optional(),
                passport_expiration_date: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const EducationGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                education_start_date: z.string().optional(),
                education_end_date: z.string().optional(),
                education_degree: z.string().optional(),
                education_field_of_study: z.string().optional(),
                education_school: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const WorkExperienceGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                work_experience_start_date: z.string().optional(),
                work_experience_end_date: z.string().optional(),
                work_experience_job_title: z.string().optional(),
                work_experience_company: z.string().optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const StringValueGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z.string().optional()
    })
    .passthrough();

const CompositeValueGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z.record(z.string(), z.unknown()).optional()
    })
    .passthrough();

const ContactGroupItemSchema = z
    .object({
        row_id: z.string().optional(),
        is_primary: z.boolean().optional(),
        value: z
            .object({
                contact_name: z.string().optional(),
                contact_relationship: z.string().optional(),
                contact_phone: z.string().optional(),
                contact_email: z.string().optional(),
                contact_country: CountrySchema.optional()
            })
            .passthrough()
            .optional()
    })
    .passthrough();

const MaritalStatusGroupSchema = z
    .object({
        marital_status: z.string().optional()
    })
    .passthrough();

const OutputSchema = z
    .object({
        id: z.string(),
        firstname: z.string().optional(),
        lastname: z.string().optional(),
        preferred_name: z.string().optional(),
        employee_number: z.string().optional(),
        status: z.string().optional(),
        country: CountrySchema.optional(),
        address: AddressSchema.optional(),
        gender: z.string().optional(),
        birthdate: z.string().optional(),
        marital_status_group: MaritalStatusGroupSchema.optional(),
        phone_group: z.array(PhoneGroupItemSchema).optional(),
        work_email: z.string().optional(),
        personal_email: z.array(EmailGroupItemSchema).optional(),
        chat_group: z.array(ChatGroupItemSchema).optional(),
        social_group: z.array(SocialGroupItemSchema).optional(),
        job_title: z.string().optional(),
        hire_date: z.string().optional(),
        start_date: z.string().optional(),
        legal_entity: z.string().optional(),
        department: z.string().optional(),
        reports_to: z.string().optional(),
        direct_reports: z.array(DirectReportSchema).optional(),
        employment_group: z.array(EmploymentGroupItemSchema).optional(),
        work_schedule: z.string().optional(),
        salary_group: z.array(SalaryGroupItemSchema).optional(),
        bank_details_group: BankDetailsGroupSchema.optional(),
        social_security_number_group: SsnGroupSchema.optional(),
        national_identification_number_group: NinGroupSchema.optional(),
        social_insurance_number_group: z.array(SinGroupItemSchema).optional(),
        tax_identification_number_group: TaxIdGroupSchema.optional(),
        nationality: CountrySchema.optional(),
        citizenship: z.array(CitizenshipItemSchema).optional(),
        passport_group: z.array(PassportGroupItemSchema).optional(),
        visa_group: z.array(CompositeValueGroupItemSchema).optional(),
        education_group: z.array(EducationGroupItemSchema).optional(),
        work_experience_group: z.array(WorkExperienceGroupItemSchema).optional(),
        skills: z.array(StringValueGroupItemSchema).optional(),
        language: z.array(StringValueGroupItemSchema).optional(),
        contact_group: z.array(ContactGroupItemSchema).optional()
    })
    .passthrough();

const action = createAction({
    description: 'Retrieve full HR detail for a single employee.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['r_employees'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://workable.readme.io/reference/employeesid
            endpoint: `/spi/v3/employees/${encodeURIComponent(input.id)}`,
            params: {
                member_id: input.member_id
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Employee not found',
                id: input.id
            });
        }

        const employee = OutputSchema.parse(response.data);
        return employee;
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
