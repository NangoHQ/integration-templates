import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-like.js';

describe('linkedin create-like tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-like',
        Model: 'ActionOutput_linkedin_createlike'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
