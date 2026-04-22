import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-issue.js';

describe('linear update-issue tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-issue',
        Model: 'ActionOutput_linear_updateissue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
