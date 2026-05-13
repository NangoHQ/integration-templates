import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-like.js';

describe('linkedin delete-like tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-like',
        Model: 'ActionOutput_linkedin_deletelike'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
