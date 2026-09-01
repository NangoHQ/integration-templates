import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/unarchive-macros.js';

describe('gorgias unarchive-macros tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'unarchive-macros',
        Model: 'ActionOutput_gorgias_unarchivemacros'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
