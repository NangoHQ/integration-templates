import { createAction } from "nango";
import { entitySchema } from '../schema.zod.js';
import type { LinearFetchFieldsResponse, LinearFieldResponse, LinearFieldTypeResponse } from '../types.js';

import type { ProxyConfiguration } from "nango";
import type { Field} from "../models.js";
import { FieldResponse, Entity } from "../models.js";

interface ResolvedField {
    name?: string;
    type: string | null;
    ref: string | null;
    children?: ResolvedField;
    required: boolean;
}

const action = createAction({
    description: "Introspection endpoint to fetch the fields available per a model",
    version: "0.0.1",

    endpoint: {
        method: "GET",
        path: "/fields",
        group: "Fields"
    },

    input: Entity,
    output: FieldResponse,

    exec: async (nango, input): Promise<FieldResponse> => {
        const parsedInput = await nango.zodValidateInput({ zodSchema: entitySchema, input });

        const { name } = parsedInput.data;
        const query = createQuery(name);
        const config: ProxyConfiguration = {
            // https://studio.apollographql.com/public/Linear-API/variant/current/explorer
            endpoint: '/graphql',
            data: { query },
            retries: 3
        };

        const response = await nango.post<LinearFetchFieldsResponse>(config);
        const { data } = response.data;
        const fieldData = data[name.toLowerCase()];

        if (!fieldData) {
            throw new nango.ActionError({
                message: `No fields found for entity ${name}`
            });
        }

        // Convert each GraphQL field into a custom field type we can easily work with
        const fields: ResolvedField[] = fieldData.fields.map(convertLinearFieldToCustomField);

        // Return the final structure that matches FieldResponse
        return buildFieldResponseFromResolvedFields(fields);
    }
});

export type NangoActionLocal = Parameters<typeof action["exec"]>[0];
export default action;

/**
 * Build a GraphQL introspection query for the given type name
 */
const createQuery = (name: string): string => `
query {
  ${name.toLowerCase()}: __type(name: "${name}") {
    fields {
      name
      type {
        kind
        name
        ofType {
          kind
          name
          ofType {
            kind
            name
            ofType {
              kind
              name
              ofType {
                kind
                name
              }
            }
          }
        }
      }
    }
  }
}
`;

interface EditedField {
  name: string;
  label: string;
  type: string;
  [key: string]: string | Field | undefined;
};

function convertResolvedFieldToField(r: ResolvedField): Field {
    // Decide which type to use: if there's a `ref`,
    // store that in `type`, else use r.type or "unknown"
    const fieldType = r.ref ? r.ref : (r.type ?? 'unknown');

    const field: EditedField = {
        name: r.name ?? '',
        label: r.name ?? '',
        type: fieldType
    };

    // If there's a child, nest it.
    if (r.children) {
        if (r.type === 'object') {
            // For "object", store the child by its name
            const child = convertResolvedFieldToField(r.children);
            if (child['name'] && typeof child['name'] === 'string') {
                field[child['name']] = child;
            }
        } else if (r.type === 'array') {
            // For "array", store the child under "items"
            const child = convertResolvedFieldToField(r.children);
            field['items'] = child;
        }
    }

    // eslint-disable-next-line @nangohq/custom-integrations-linting/no-object-casting
    return field as Field;
}

/**
 * Build a FieldResponse from an array of ResolvedField.
 */
export function buildFieldResponseFromResolvedFields(resolvedFields: ResolvedField[]): FieldResponse {
    const fields: Field[] = [];

    resolvedFields.forEach((rf) => {
        // Only convert if there is a name
        if (!rf.name) return;

        const field = convertResolvedFieldToField(rf);
        fields.push(field);
    });

    return { fields };
}

/**
 * Takes a `LinearFieldResponse` and converts it into a `ResolvedField`
 * which is a custom structure that we can easily work with to parse
 * into JSONSchema
 */
const convertLinearFieldToCustomField = (field: LinearFieldResponse): ResolvedField => {
    let result: ResolvedField = {
        type: null,
        ref: null,
        required: false
    };
    const { name, type } = field;
    result.name = name;
    result = { ...result, ...resolveTypeName(type) };
    return result;
};

/*
 * Unwraps a GraphQL type and returns a detailed structure that includes
 * the base kind and name, as well as all the wrappers that were applied
 * to the type.
 */

function unwrapTypeDetailed(type: LinearFieldTypeResponse): {
    baseKind: string;
    baseName: string | null;
    wrappers: string[];
} {
    const wrappers: string[] = [];
    let current: LinearFieldTypeResponse | null = type;

    while (current) {
        if (current.kind === 'NON_NULL') {
            wrappers.push('NON_NULL');
            current = current.ofType;
        } else if (current.kind === 'LIST') {
            wrappers.push('LIST');
            current = current.ofType;
        } else {
            return {
                baseKind: current.kind,
                baseName: current.name,
                wrappers
            };
        }
    }

    // we should never reach this point
    // but it is a fallback in case something goes wrong
    return {
        baseKind: 'UNKNOWN',
        baseName: null,
        wrappers
    };
}

/*
 * Takes a `ofType` field from a GraphQL introspection response and
 * resolves it into a `MappedField` structure that we can easily work
 * with to generate JSONSchema.
 */
function resolveTypeName(type: LinearFieldTypeResponse): ResolvedField {
    const { baseKind, baseName, wrappers } = unwrapTypeDetailed(type);

    // Build the "base" type
    let current: ResolvedField = {
        required: false,
        type: null,
        ref: null
    };

    switch (baseKind) {
        case 'SCALAR':
            {
                const type = mapScalarNameToType(baseName);
                // set ref if it is a custom scalar
                type.startsWith('#/definitions/') ? (current.ref = type) : (current.type = type);
            }
            break;
        case 'ENUM':
            current.type = 'string';
            break;
        case 'OBJECT':
            // objects are usually custom types
            current.type = 'object';
            current.ref = `#/definitions/${baseName}`;
            break;
        default:
            // fallback for unknown types
            current.type = 'object';
            current.ref = `#/definitions/${baseName}`;
            break;
    }

    // Wrap from inside out to construct nested structures
    wrappers.reverse().forEach((wrapper) => {
        if (wrapper === 'NON_NULL') {
            // Mark the CURRENT structure as required
            // when it is wrapped in a NON_NULL
            current.required = true;
        } else if (wrapper === 'LIST') {
            // Wrap the CURRENT structure in an "array" layer
            // We can safely do this because we know that the
            // current structure is not a different type of wrapper
            // and either a `NON_NULL` or a `LIST`. But we've handled
            // `NON_NULL` above, so we can safely assume that the
            // current structure is a `LIST`.
            current = {
                required: false,
                type: 'array',
                ref: null,
                children: current
            };
        }
    });

    return current;
}

/*
 * Maps a scalar name to a JSONSchema type
 */
function mapScalarNameToType(name: string | null): string {
    switch (name) {
        case 'String':
        case 'ID':
        case 'DateTime':
        case 'TimelessDate':
            return 'string';
        case 'Float':
        case 'Int':
            return 'number';
        case 'Boolean':
            return 'boolean';
        case 'JSONObject':
            return 'object';
        default:
            // fallback for custom scalars
            return `#/definitions/${name}`;
    }
}
