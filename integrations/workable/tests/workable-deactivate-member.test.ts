import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/deactivate-member.js';

describe('workable deactivate-member tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'deactivate-member',
        Model: 'ActionOutput_workable_deactivatemember'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
