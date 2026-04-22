import { z } from 'zod';
import { createAction } from 'nango';

const InputSchema = z.object({
    id: z.string().describe('The ID of the cycle to update. Example: "cycle-123"'),
    name: z.string().optional().describe('The name of the cycle. Example: "Sprint 23"'),
    description: z.string().optional().describe('The description of the cycle.'),
    starts_at: z.string().optional().describe('The start date of the cycle (ISO 8601 format). Example: "2025-01-01T00:00:00.000Z"'),
    ends_at: z.string().optional().describe('The end date of the cycle (ISO 8601 format). Example: "2025-01-14T23:59:59.000Z"'),
    completed_at: z.string().optional().describe('The completion date of the cycle (ISO 8601 format). Example: "2025-01-15T00:00:00.000Z"')
});

const OutputSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.union([z.string(), z.null()]),
    number: z.number(),
    starts_at: z.string(),
    ends_at: z.string(),
    completed_at: z.union([z.string(), z.null()]),
    created_at: z.string(),
    updated_at: z.string()
});

function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
    return typeof value === 'number';
}

function isBoolean(value: unknown): value is boolean {
    return typeof value === 'boolean';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringOrNull(value: unknown): value is string | null {
    return isString(value) || value === null;
}

const action = createAction({
    description: 'Update an existing Linear cycle',
    version: '1.0.0',
    endpoint: {
        method: 'POST',
        path: '/actions/update-cycle',
        group: 'Cycles'
    },
    input: InputSchema,
    output: OutputSchema,
    scopes: ['write'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        const mutation = `
            mutation CycleUpdate($id: String!, $input: CycleUpdateInput!) {
                cycleUpdate(id: $id, input: $input) {
                    success
                    cycle {
                        id
                        name
                        description
                        number
                        startsAt
                        endsAt
                        completedAt
                        createdAt
                        updatedAt
                    }
                }
            }
        `;

        const inputVars: Record<string, string> = {};

        if (input.name) {
            inputVars['name'] = input.name;
        }
        if (input.description) {
            inputVars['description'] = input.description;
        }
        if (input.starts_at) {
            inputVars['startsAt'] = input.starts_at;
        }
        if (input.ends_at) {
            inputVars['endsAt'] = input.ends_at;
        }
        if (input.completed_at) {
            inputVars['completedAt'] = input.completed_at;
        }

        const variables = {
            id: input.id,
            input: inputVars
        };

        // https://developers.linear.app/docs/graphql/workflow-cycle-management
        const response = await nango.post({
            endpoint: '/graphql',
            data: {
                query: mutation,
                variables: variables
            },
            retries: 3
        });

        const responseData = response.data;

        if (!isRecord(responseData)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API'
            });
        }

        // Check for GraphQL errors
        const errors = responseData['errors'];
        if (Array.isArray(errors) && errors.length > 0) {
            const firstError = errors[0];
            if (isRecord(firstError)) {
                const message = firstError['message'];
                if (isString(message)) {
                    throw new nango.ActionError({
                        type: 'graphql_error',
                        message: message
                    });
                }
            }
        }

        const data = responseData['data'];

        if (!isRecord(data)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API: invalid data'
            });
        }

        const cycleUpdateResult = data['cycleUpdate'];

        if (!isRecord(cycleUpdateResult)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid response from Linear API: invalid cycleUpdate'
            });
        }

        const successValue = cycleUpdateResult['success'];
        const cycleValue = cycleUpdateResult['cycle'];

        if (!isBoolean(successValue) || !successValue) {
            throw new nango.ActionError({
                type: 'update_failed',
                message: 'Failed to update cycle'
            });
        }

        if (!isRecord(cycleValue)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid cycle data in response'
            });
        }

        const id = cycleValue['id'];
        const name = cycleValue['name'];
        const number = cycleValue['number'];
        const startsAt = cycleValue['startsAt'];
        const endsAt = cycleValue['endsAt'];
        const createdAt = cycleValue['createdAt'];
        const updatedAt = cycleValue['updatedAt'];
        const description = cycleValue['description'];
        const completedAt = cycleValue['completedAt'];

        if (!isString(id) || !isString(name) || !isNumber(number) || !isString(startsAt) || !isString(endsAt) || !isString(createdAt) || !isString(updatedAt)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid cycle data types in response'
            });
        }

        if (!isStringOrNull(description) || !isStringOrNull(completedAt)) {
            throw new nango.ActionError({
                type: 'invalid_response',
                message: 'Invalid optional cycle data types in response'
            });
        }

        return {
            id: id,
            name: name,
            description: description,
            number: number,
            starts_at: startsAt,
            ends_at: endsAt,
            completed_at: completedAt,
            created_at: createdAt,
            updated_at: updatedAt
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
