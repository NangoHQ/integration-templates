import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z
    .object({
        trip_id: z.string().describe('The unique identifier of the trip to retrieve. Example: "635c9868-fe5f-4124-bf3a-bf2a7df83396"')
    })
    .describe('Identifier of the trip to fetch.');

const TravelLocationSchema = z.object({
    city: z.string().nullable().describe('City of the location, or null when unknown.'),
    country: z.string().nullable().describe('Country of the location, or null when unknown.'),
    state: z.string().nullable().describe('State or region of the location, or null when unknown.'),
    latitude: z.number().nullable().describe('Latitude coordinate of the location, or null when unknown.'),
    longitude: z.number().nullable().describe('Longitude coordinate of the location, or null when unknown.')
});

const TripLocationSegmentSchema = z.object({
    start_date: z.string().describe('ISO 8601 timestamp when the trip segment starts.'),
    end_date: z.string().describe('ISO 8601 timestamp when the trip segment ends.'),
    location: TravelLocationSchema.describe('The location visited during this trip segment.')
});

const TripSpendEventSchema = z.object({
    id: z.string().describe('Unique identifier of the associated spend event.'),
    spend_type: z.enum(['BILL', 'REIMBURSEMENT', 'TRANSACTION']).describe('Type of the associated spend event.')
});

const SignedAmountSchema = z.object({
    currency: z.string().describe('ISO 4217 currency code of the amount. Example: "USD"'),
    value: z.number().describe('Amount in the smallest denomination of the currency (e.g. cents for USD); may be negative.')
});

const OutputSchema = z
    .object({
        id: z.string().describe('Unique identifier of the trip.'),
        name: z.string().describe('Name of the trip.'),
        description: z.string().nullable().describe('Description of the trip, or null when none was provided.'),
        status: z.enum(['cancelled', 'completed', 'ongoing', 'upcoming']).describe('Current status of the trip.'),
        user_id: z.string().describe('Unique identifier of the traveler (user) the trip belongs to.'),
        start_date: z.string().describe('ISO 8601 timestamp when the trip starts.'),
        end_date: z.string().describe('ISO 8601 timestamp when the trip ends.'),
        length_in_days: z.number().describe('Number of days the trip spans.'),
        locations: z.array(TripLocationSegmentSchema).describe('Destinations and location segments for the trip.'),
        spend_events: z.array(TripSpendEventSchema).describe('Spend events associated with the trip.'),
        travel_types: z.array(z.enum(['CAR', 'FLIGHT', 'HOTEL'])).describe('Types of travel booked for the trip.'),
        total_spend: z.number().describe('Deprecated total spend for the trip; prefer total_spend_amount.'),
        total_spend_amount: SignedAmountSchema.nullable().describe(
            'Total spend in minor units with an explicit currency, or null when the trip has no spend events or mixed currencies.'
        ),
        created_at: z.string().describe('ISO 8601 timestamp when the trip was created.'),
        updated_at: z.string().describe('ISO 8601 timestamp when the trip was last updated.')
    })
    .describe('A single trip for the business.');

/**
 * @tags: [read]
 * @tagReason: Fetches a single trip from the provider and does not modify any data.
 * @pitfalls: Returns 404 for a trip_id that does not exist; total_spend is deprecated in favor of total_spend_amount, which is null when the trip has no spend events or mixed currencies and may be negative for refund-dominated trips.
 */
const action = createAction({
    description: 'Retrieve a single trip by ID.',
    version: '1.0.0',
    input: InputSchema,
    output: OutputSchema,
    scopes: ['trips:read'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const response = await nango.get({
            // https://docs.ramp.com/developer-api/v1/api/trips
            endpoint: `/developer/v1/trips/${encodeURIComponent(input.trip_id)}`,
            retries: 3
        });

        return OutputSchema.parse(response.data);
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
