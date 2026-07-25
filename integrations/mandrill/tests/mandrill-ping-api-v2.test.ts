import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/ping-api-v2.js';

describe('mandrill ping-api-v2 tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'ping-api-v2',
        Model: 'ActionOutput_mandrill_pingapiv2'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
