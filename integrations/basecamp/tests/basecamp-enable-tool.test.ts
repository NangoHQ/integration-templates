import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/enable-tool.js';

describe('basecamp enable-tool tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'enable-tool',
        Model: 'ActionOutput_basecamp_enabletool'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
