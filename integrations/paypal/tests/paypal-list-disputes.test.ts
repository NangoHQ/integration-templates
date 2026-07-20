import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-disputes.js';

describe('paypal list-disputes tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-disputes',
        Model: 'ActionOutput_paypal_sandbox_listdisputes'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
