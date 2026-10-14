import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-transaction-full-context.js';

describe('ramp get-transaction-full-context tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-transaction-full-context',
        Model: 'ActionOutput_ramp_gettransactionfullcontext'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
