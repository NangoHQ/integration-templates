import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-forum.js';

describe('freshdesk create-forum tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-forum',
        Model: 'ActionOutput_freshdesk_createforum'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
