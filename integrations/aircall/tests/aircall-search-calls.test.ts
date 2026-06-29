import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-calls.js';

describe('aircall search-calls tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-calls',
        Model: 'ActionOutput_aircall_basic_searchcalls'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
