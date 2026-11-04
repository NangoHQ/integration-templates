import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-media.js';

describe('instagram list-media tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-media',
        Model: 'ActionOutput_instagram_listmedia'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
