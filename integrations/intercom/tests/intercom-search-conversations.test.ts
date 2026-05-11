import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-conversations.js';

describe('intercom search-conversations tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-conversations',
        Model: 'ActionOutput_intercom_searchconversations'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
