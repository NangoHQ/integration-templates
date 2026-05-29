import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-interviews.js';

describe('ashby list-interviews tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-interviews',
        Model: 'ActionOutput_ashby_listinterviews'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
