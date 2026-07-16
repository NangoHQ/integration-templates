import { expect, it, describe } from 'vitest';

import createAction from '../actions/cancel-invoice.js';

describe('squareup-sandbox cancel-invoice tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'cancel-invoice',
        Model: 'ActionOutput_squareup_sandbox_cancelinvoice'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
