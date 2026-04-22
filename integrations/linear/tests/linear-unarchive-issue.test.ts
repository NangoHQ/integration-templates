import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unarchive-issue.js';

describe('linear unarchive-issue tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unarchive-issue',
        Model: 'ActionOutput_linear_unarchiveissue'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
