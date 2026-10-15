import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-mural-tags.js';

describe('mural list-mural-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-mural-tags',
        Model: 'ActionOutput_mural_listmuraltags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
