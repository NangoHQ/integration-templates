import { vi, expect, it, describe } from 'vitest';

import runAction from '../actions/get-postings.js';

describe('lever get-postings tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-postings',
        Model: 'SuccessResponse'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await runAction(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
