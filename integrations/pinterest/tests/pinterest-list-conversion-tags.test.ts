import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-conversion-tags.js';

describe('pinterest list-conversion-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-conversion-tags',
        Model: 'ActionOutput_pinterest_listconversiontags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
