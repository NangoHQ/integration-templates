import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-forum.js';

describe('freshdesk delete-forum tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-forum',
        Model: 'ActionOutput_freshdesk_deleteforum'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
