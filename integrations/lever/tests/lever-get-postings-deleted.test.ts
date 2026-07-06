import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-postings-deleted.js';

describe('lever-basic get-postings-deleted tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-postings-deleted',
        Model: 'ActionOutput_lever_basic_getpostingsdeleted'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
