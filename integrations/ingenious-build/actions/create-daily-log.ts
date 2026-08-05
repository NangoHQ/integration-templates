import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    project_id: z.string().describe('Project ID. Example: "6a71de59f55241acad0cd44e"'),
    date: z.string().describe('Log date in Y-m-d format. Example: "2026-08-04"'),
    status: z.enum(['draft', 'submitted', 'approved']).describe('Log status.'),
    work_logs: z
        .array(
            z.object({
                company_id: z.string(),
                number_of_employees: z.number(),
                jobsite_hours: z.number().nullable().optional(),
                description: z.string().nullable().optional(),
                document_ids: z.array(z.string()).nullable().optional()
            })
        )
        .optional(),
    waste: z
        .array(
            z.object({
                waste_type: z.enum(['material', 'demolition-debris', 'packaging', 'hazardous', 'recyclable-reusable']),
                disposal_method: z.enum(['sent-to-landfill', 'recycled-or-repurposed', 'waste-management-service']),
                material: z.string(),
                unit_of_measure: z.enum([
                    'square-feet',
                    'cubic-yards',
                    'pounds',
                    'gallons',
                    'each',
                    'yards',
                    'inches',
                    'tons',
                    'linear-feet',
                    'hours',
                    'square-meters',
                    'cubic-meters',
                    'kilograms',
                    'liters',
                    'meters',
                    'millimeters',
                    'linear-meters'
                ]),
                quantity: z.number(),
                description: z.string().nullable().optional(),
                document_ids: z.array(z.string()).nullable().optional()
            })
        )
        .optional(),
    delays: z
        .array(
            z.object({
                delay_type_id: z.string(),
                start_time: z.string(),
                end_time: z.string(),
                description: z.string(),
                document_ids: z.array(z.string()).nullable().optional()
            })
        )
        .optional(),
    safety_incidents: z
        .array(
            z.object({
                affected_party_id: z.string(),
                incident_type: z.enum([
                    'slips-trips-and-falls',
                    'struck-by-incidents',
                    'caught-in-between-incidents',
                    'electrocutions',
                    'equipment-related-incidents',
                    'hazardous-substance-exposure',
                    'manual-handling-ergonomic-injuries',
                    'fire-and-explosion',
                    'near-misses',
                    'property-or-equipment-damage',
                    'cuts-laceration',
                    'trench-or-excavation-incidents',
                    'noise-induced-hearing-loss',
                    'heat-stress-or-cold-exposure',
                    'inadequate-ppe-usage',
                    'other'
                ]),
                incident_time: z.string(),
                description: z.string(),
                document_ids: z.array(z.string()).nullable().optional()
            })
        )
        .optional(),
    safety_violations: z
        .array(
            z.object({
                type: z.enum([
                    'fall-protection',
                    'hazard-communication',
                    'scaffolding',
                    'lockout-tagout',
                    'respiratory-protection',
                    'ladders',
                    'equipment',
                    'machine-guarding',
                    'ppe',
                    'other'
                ]),
                issued_to_company_id: z.string(),
                violation_time: z.string(),
                description: z.string(),
                document_ids: z.array(z.string()).nullable().optional()
            })
        )
        .optional(),
    equipment: z
        .array(
            z.object({
                equipment_name: z.string(),
                equipment_hours: z.number(),
                equipment_number: z.string().nullable().optional(),
                comment: z.string().nullable().optional()
            })
        )
        .optional(),
    visitors: z
        .array(
            z.object({
                name: z.string(),
                company_name: z.string(),
                time_in: z.string(),
                time_out: z.string(),
                email: z.string().nullable().optional(),
                phone_number: z.string().nullable().optional(),
                description: z.string().nullable().optional()
            })
        )
        .optional(),
    notes: z
        .array(
            z.object({
                description: z.string(),
                document_ids: z.array(z.string()).nullable().optional()
            })
        )
        .optional(),
    weather: z
        .object({
            timeline: z
                .array(
                    z.object({
                        time: z.string(),
                        is_forecast: z.boolean(),
                        weather_code: z.enum([
                            'sun',
                            'moon',
                            'cloudy-sun',
                            'cloudy-moon',
                            'sun-rain',
                            'moon-rain',
                            'cloudy',
                            'rain',
                            'storm',
                            'snow',
                            'snow-rain',
                            'sun-snow',
                            'moon-snow',
                            'light-fog',
                            'fog',
                            'pellets',
                            'sun-pellets',
                            'moon-pellets',
                            'not-supported-weather'
                        ]),
                        temperature: z.number(),
                        wind_speed: z.number(),
                        precipitation: z.number(),
                        humidity: z.number()
                    })
                )
                .nullable()
                .optional(),
            observed_conditions: z
                .array(
                    z.object({
                        observed_conditions: z.string(),
                        weather_category: z
                            .enum(['extreme-heat', 'flooded', 'frozen', 'high-winds', 'ice-sleet-hail', 'rain', 'smoke', 'snow', 'fair', 'other'])
                            .nullable()
                            .optional()
                    })
                )
                .nullable()
                .optional()
        })
        .optional()
});

const ProviderResponseSchema = z.object({
    id: z.string()
});

const OutputSchema = z.object({
    id: z.string()
});

const action = createAction({
    description: 'Create a new daily log for a project.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.post({
            // https://api.ingenious.build/reference/v2-create-daily-log
            endpoint: '/api/v2/pub/daily-logs',
            data: {
                project_id: input.project_id,
                date: input.date,
                status: input.status,
                ...(input.work_logs !== undefined && { work_logs: input.work_logs }),
                ...(input.waste !== undefined && { waste: input.waste }),
                ...(input.delays !== undefined && { delays: input.delays }),
                ...(input.safety_incidents !== undefined && { safety_incidents: input.safety_incidents }),
                ...(input.safety_violations !== undefined && { safety_violations: input.safety_violations }),
                ...(input.equipment !== undefined && { equipment: input.equipment }),
                ...(input.visitors !== undefined && { visitors: input.visitors }),
                ...(input.notes !== undefined && { notes: input.notes }),
                ...(input.weather !== undefined && { weather: input.weather })
            },
            // No provider-supported idempotency key exists for this endpoint. A single write
            // retry (the same convention used by other Ingenious Build create actions) bounds
            // the risk of creating a duplicate daily log on a transient failure.
            retries: 1
        });

        const providerResponse = ProviderResponseSchema.parse(response.data);

        return {
            id: providerResponse.id
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
