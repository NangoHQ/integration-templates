import { z } from 'zod';
import { createAction, ProxyConfiguration } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('Daily log ID. Example: "6a71dfb1f55241acad0cd583"')
});

const DelaySchema = z.object({
    id: z.string(),
    delay_type_id: z.string(),
    start_time: z.string(),
    end_time: z.string().nullable(),
    total_delay_hours: z.number().nullable(),
    description: z.string(),
    documents: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const SafetyIncidentSchema = z.object({
    id: z.string(),
    affected_party_id: z.string().nullable(),
    incident_type: z.string(),
    incident_time: z.string(),
    description: z.string(),
    documents: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const SafetyViolationSchema = z.object({
    id: z.string(),
    type: z.string(),
    issued_to_company_id: z.string().nullable(),
    violation_time: z.string(),
    description: z.string(),
    documents: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const EquipmentSchema = z.object({
    id: z.string(),
    equipment_number: z.string().nullable(),
    equipment_name: z.string(),
    equipment_hours: z.number(),
    comment: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const VisitorSchema = z.object({
    id: z.string(),
    name: z.string(),
    company_name: z.string(),
    time_in: z.string(),
    time_out: z.string(),
    email: z.string().nullable(),
    phone_number: z.string().nullable(),
    description: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const NoteSchema = z.object({
    id: z.string(),
    description: z.string(),
    created_by_id: z.string(),
    documents: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const WeatherTimelineSchema = z.object({
    time: z.string(),
    is_forecast: z.boolean(),
    weather_code: z.string(),
    temperature: z.number(),
    wind_speed: z.number(),
    precipitation: z.number(),
    humidity: z.number()
});

const WeatherObservedConditionSchema = z.object({
    id: z.string(),
    observed_conditions: z.string(),
    weather_category: z.string().nullable()
});

const WeatherSchema = z.object({
    id: z.string(),
    precipitation: z.number(),
    timeline: z.array(WeatherTimelineSchema),
    observed_conditions: z.array(WeatherObservedConditionSchema),
    created_at: z.string(),
    updated_at: z.string()
});

const WorkLogSchema = z.object({
    id: z.string(),
    company_id: z.string(),
    number_of_employees: z.number().int(),
    jobsite_hours: z.number().nullable(),
    description: z.string().nullable(),
    documents: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const WasteSchema = z.object({
    id: z.string(),
    waste_type: z.string(),
    disposal_method: z.string(),
    material: z.string(),
    unit_of_measure: z.string(),
    quantity: z.number().int(),
    description: z.string().nullable(),
    documents: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const ManpowerSchema = z.object({
    id: z.string(),
    employee_id: z.string(),
    is_layoff_payroll: z.boolean(),
    time_in: z.string(),
    time_out: z.string(),
    manhours: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const SubcontractorManpowerSchema = z.object({
    id: z.string(),
    responsible_contractor_id: z.string().nullable(),
    number_of_employees: z.number().int(),
    hours_on_jobsite: z.number(),
    total_hours_on_jobsite: z.number(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProductivitySchema = z.object({
    id: z.string(),
    is_sov_line_item: z.boolean(),
    sov_line_item: z.string().nullable(),
    task_description: z.string(),
    progress: z.number().int().nullable(),
    expected_completed_at: z.string().nullable(),
    documents: z.array(z.string()),
    created_at: z.string(),
    updated_at: z.string()
});

const WasteV1Schema = z.object({
    id: z.string(),
    company_name: z.string(),
    container_size: z.number(),
    diversion_rate: z.number().nullable(),
    comment: z.string().nullable(),
    created_at: z.string(),
    updated_at: z.string()
});

const ProviderDailyLogSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    status: z.string(),
    date: z.string(),
    reported_by_id: z.string(),
    responsible_contractor_id: z.string(),
    total_hours: z.number().nullable(),
    total_delay_hours: z.number().nullable(),
    person_count: z.number().int().nullable(),
    safety_incidents_count: z.number().int().nullable(),
    safety_violations_count: z.number().int().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    delays: z.array(DelaySchema),
    safety_incidents: z.array(SafetyIncidentSchema),
    safety_violations: z.array(SafetyViolationSchema),
    equipment: z.array(EquipmentSchema),
    visitors: z.array(VisitorSchema),
    notes: z.array(NoteSchema),
    weather: WeatherSchema.nullable(),
    work_log: z.array(WorkLogSchema),
    waste: z.array(WasteSchema),
    manpower: z.array(ManpowerSchema).nullable().optional(),
    subcontractor_manpower: z.array(SubcontractorManpowerSchema).nullable().optional(),
    productivity: z.array(ProductivitySchema).nullable().optional(),
    waste_v1: z.array(WasteV1Schema).nullable().optional()
});

const OutputSchema = z.object({
    id: z.string(),
    project_id: z.string(),
    status: z.string(),
    date: z.string(),
    reported_by_id: z.string(),
    responsible_contractor_id: z.string(),
    total_hours: z.number().nullable(),
    total_delay_hours: z.number().nullable(),
    person_count: z.number().int().nullable(),
    safety_incidents_count: z.number().int().nullable(),
    safety_violations_count: z.number().int().nullable(),
    created_at: z.string(),
    updated_at: z.string(),
    delays: z.array(DelaySchema),
    safety_incidents: z.array(SafetyIncidentSchema),
    safety_violations: z.array(SafetyViolationSchema),
    equipment: z.array(EquipmentSchema),
    visitors: z.array(VisitorSchema),
    notes: z.array(NoteSchema),
    weather: WeatherSchema.optional(),
    work_log: z.array(WorkLogSchema),
    waste: z.array(WasteSchema),
    manpower: z.array(ManpowerSchema).nullable().optional(),
    subcontractor_manpower: z.array(SubcontractorManpowerSchema).nullable().optional(),
    productivity: z.array(ProductivitySchema).nullable().optional(),
    waste_v1: z.array(WasteV1Schema).nullable().optional()
});

const action = createAction({
    description: 'Get a single daily log by id.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: [],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const config: ProxyConfiguration = {
            // https://api.ingenious.build/reference/v2-get-daily-log.md
            endpoint: `/api/v2/pub/daily-logs/${encodeURIComponent(input.id)}`,
            retries: 3
        };
        const response = await nango.get(config);

        if (!response.data) {
            throw new nango.ActionError({
                type: 'not_found',
                message: 'Daily log not found',
                id: input.id
            });
        }

        const providerLog = ProviderDailyLogSchema.parse(response.data);
        const { weather, ...rest } = providerLog;
        return {
            ...rest,
            ...(weather != null && { weather })
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
