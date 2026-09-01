import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-tool.js';

describe('basecamp update-tool tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-tool',
        Model: 'ActionOutput_basecamp_updatetool'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
