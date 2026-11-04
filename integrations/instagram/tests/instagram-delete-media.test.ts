import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-media.js';

describe('instagram delete-media tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-media',
        Model: 'ActionOutput_instagram_deletemedia'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
