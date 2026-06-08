import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-organization.js';

describe('trello get-organization tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-organization',
        Model: 'ActionOutput_trello_getorganization'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
