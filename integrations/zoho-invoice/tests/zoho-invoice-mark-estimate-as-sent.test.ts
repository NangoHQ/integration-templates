import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-estimate-as-sent.js';

describe('zoho-invoice mark-estimate-as-sent tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-estimate-as-sent',
        Model: 'ActionOutput_zoho_invoice_markestimateassent'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
