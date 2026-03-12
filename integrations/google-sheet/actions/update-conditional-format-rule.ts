import { z } from 'zod';
import { createAction } from 'nango';

// Input schema for updating a conditional format rule
const InputSchema = z.object({
    spreadsheet_id: z.string().describe('The ID of the spreadsheet to update. Example: "1aBcD..."'),
    sheet_id: z.number().optional().describe('The ID of the sheet to apply the rule to. If not specified, applies to all sheets.'),
    index: z.number().describe('The zero-based index of the rule to update or move.'),
    new_index: z.number().optional().describe('The zero-based new index to move the rule to. Use this to reorder rules.'),
    rule: z
        .object({
            ranges: z
                .array(
                    z.object({
                        sheet_id: z.number().optional(),
                        start_row_index: z.number().optional(),
                        end_row_index: z.number().optional(),
                        start_column_index: z.number().optional(),
                        end_column_index: z.number().optional()
                    })
                )
                .describe('The ranges to apply the conditional format to.'),
            boolean_rule: z
                .object({
                    condition: z.object({
                        type: z.string().describe('The type of condition. Examples: "BOOLEAN", "NUMBER_GREATER", "TEXT_CONTAINS".'),
                        values: z
                            .array(
                                z.object({
                                    user_entered_value: z.string().optional()
                                })
                            )
                            .optional()
                    }),
                    format: z
                        .object({
                            background_color: z
                                .object({
                                    red: z.number().optional(),
                                    green: z.number().optional(),
                                    blue: z.number().optional(),
                                    alpha: z.number().optional()
                                })
                                .optional(),
                            text_format: z
                                .object({
                                    bold: z.boolean().optional(),
                                    italic: z.boolean().optional(),
                                    font_family: z.string().optional()
                                })
                                .optional()
                        })
                        .optional()
                })
                .optional()
                .describe('A boolean rule - formats cells based on true/false condition.'),
            gradient_rule: z
                .object({
                    min_point: z
                        .object({
                            color: z
                                .object({
                                    red: z.number().optional(),
                                    green: z.number().optional(),
                                    blue: z.number().optional()
                                })
                                .optional(),
                            type: z.string().optional(),
                            value: z.string().optional()
                        })
                        .optional(),
                    max_point: z
                        .object({
                            color: z
                                .object({
                                    red: z.number().optional(),
                                    green: z.number().optional(),
                                    blue: z.number().optional()
                                })
                                .optional(),
                            type: z.string().optional(),
                            value: z.string().optional()
                        })
                        .optional()
                })
                .optional()
                .describe('A gradient rule - formats cells with color gradients.')
        })
        .optional()
        .describe('The new conditional format rule. If provided, replaces the existing rule. If omitted, only moves the rule.')
});

// Output schema
const OutputSchema = z.object({
    spreadsheet_id: z.string(),
    replies: z
        .array(
            z.object({
                update_conditional_format_rule: z
                    .object({
                        new_index: z.number().optional(),
                        old_index: z.number().optional(),
                        new_rule: z.any().optional(),
                        old_rule: z.any().optional()
                    })
                    .optional()
            })
        )
        .optional(),
    success: z.boolean()
});

const action = createAction({
    description: 'Update or move a conditional format rule',
    version: '1.0.0',

    endpoint: {
        method: 'POST',
        path: '/actions/update-conditional-format-rule',
        group: 'Spreadsheets'
    },

    input: InputSchema,
    output: OutputSchema,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],

    exec: async (nango, input): Promise<z.infer<typeof OutputSchema>> => {
        // Build the UpdateConditionalFormatRuleRequest
        const updateRequest: Record<string, any> = {
            index: input.index
        };

        if (input.sheet_id !== undefined) {
            updateRequest['sheetId'] = input.sheet_id;
        }

        if (input.new_index !== undefined) {
            updateRequest['newIndex'] = input.new_index;
        }

        if (input.rule !== undefined) {
            // Transform the rule to match Google API format
            const rule: Record<string, any> = {
                ranges: input.rule.ranges.map((range: any) => {
                    const result: Record<string, any> = {};
                    if (range.sheet_id !== undefined) result['sheetId'] = range.sheet_id;
                    if (range.start_row_index !== undefined) result['startRowIndex'] = range.start_row_index;
                    if (range.end_row_index !== undefined) result['endRowIndex'] = range.end_row_index;
                    if (range.start_column_index !== undefined) result['startColumnIndex'] = range.start_column_index;
                    if (range.end_column_index !== undefined) result['endColumnIndex'] = range.end_column_index;
                    return result;
                })
            };

            if (input.rule.boolean_rule) {
                rule['booleanRule'] = {
                    condition: {
                        type: input.rule.boolean_rule.condition.type,
                        ...(input.rule.boolean_rule.condition.values && {
                            values: input.rule.boolean_rule.condition.values.map((v: any) => ({
                                userEnteredValue: v.user_entered_value
                            }))
                        })
                    },
                    format: input.rule.boolean_rule.format
                };
            }

            if (input.rule.gradient_rule) {
                rule['gradientRule'] = input.rule.gradient_rule;
            }

            updateRequest['rule'] = rule;
        }

        // https://developers.google.com/sheets/api/reference/rest/v4/spreadsheets/batchUpdate
        const response = await nango.post({
            endpoint: `/v4/spreadsheets/${input.spreadsheet_id}:batchUpdate`,
            data: {
                requests: [
                    {
                        updateConditionalFormatRule: updateRequest
                    }
                ]
            },
            retries: 3
        });

        if (!response.data) {
            throw new nango.ActionError({
                type: 'api_error',
                message: 'Failed to update conditional format rule'
            });
        }

        // Map the response to our output format
        const replies = response.data.replies?.map((reply: any) => {
            if (reply.updateConditionalFormatRule) {
                return {
                    update_conditional_format_rule: {
                        new_index: reply.updateConditionalFormatRule.newIndex,
                        old_index: reply.updateConditionalFormatRule.oldIndex,
                        new_rule: reply.updateConditionalFormatRule.newRule,
                        old_rule: reply.updateConditionalFormatRule.oldRule
                    }
                };
            }
            return reply;
        });

        return {
            spreadsheet_id: response.data.spreadsheetId || input.spreadsheet_id,
            replies: replies || [],
            success: true
        };
    }
});

export type NangoActionLocal = Parameters<(typeof action)['exec']>[0];
export default action;
