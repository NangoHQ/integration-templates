import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-transaction-line-items.js';

describe('ramp-sandbox update-transaction-line-items tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-transaction-line-items',
        Model: 'ActionOutput_ramp_sandbox_updatetransactionlineitems'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
