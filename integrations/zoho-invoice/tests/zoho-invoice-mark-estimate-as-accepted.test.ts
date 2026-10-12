import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/mark-estimate-as-accepted.js';

describe('zoho-invoice mark-estimate-as-accepted tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'mark-estimate-as-accepted',
        Model: 'ActionOutput_zoho_invoice_markestimateasaccepted'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
