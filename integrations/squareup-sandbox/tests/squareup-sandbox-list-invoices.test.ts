import { expect, it, describe } from 'vitest';

import createAction from '../actions/list-invoices.js';

describe('squareup-sandbox list-invoices tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-invoices',
        Model: 'ActionOutput_squareup_sandbox_listinvoices'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
