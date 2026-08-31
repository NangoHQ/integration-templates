import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-recordings-by-type.js';

describe('basecamp list-recordings-by-type tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-recordings-by-type',
        Model: 'ActionOutput_basecamp_listrecordingsbytype'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
