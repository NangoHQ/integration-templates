import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-capture.js';

describe('paypal get-capture tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-capture',
        Model: 'ActionOutput_paypal_sandbox_getcapture'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
