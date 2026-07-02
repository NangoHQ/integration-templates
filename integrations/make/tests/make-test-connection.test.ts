import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/test-connection.js';

describe('make test-connection tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'test-connection',
        Model: 'ActionOutput_make_testconnection'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
