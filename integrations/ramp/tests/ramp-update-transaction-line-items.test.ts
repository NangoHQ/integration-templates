import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-transaction-line-items.js';

describe('ramp update-transaction-line-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-transaction-line-items',
        Model: 'ActionOutput_ramp_updatetransactionlineitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should reject accounting selections that do not identify exactly one field and one option', () => {
        const withSelection = (selection: Record<string, string>) => ({
            transaction_id: '3f30ffab-6510-485b-aa8b-220b11c173be',
            line_items: [{ amount: 27676, accounting_field_selections: [selection] }]
        });

        expect(createAction.input.safeParse(withSelection({ field_external_id: '200', field_option_external_id: '1001' })).success).toBe(true);
        expect(createAction.input.safeParse(withSelection({ field_id: 'a', field_external_id: '200', field_option_external_id: '1001' })).success).toBe(false);
        expect(createAction.input.safeParse(withSelection({ field_option_external_id: '1001' })).success).toBe(false);
        expect(createAction.input.safeParse(withSelection({ field_external_id: '200', field_option_external_id: '1001', free_form_text: 'x' })).success).toBe(
            false
        );
        expect(createAction.input.safeParse(withSelection({ field_external_id: '200' })).success).toBe(false);
    });
});
