import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/search-messages.js';

describe('mandrill search-messages tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'search-messages',
        Model: 'ActionOutput_mandrill_searchmessages'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
