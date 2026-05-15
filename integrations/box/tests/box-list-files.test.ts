import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-files.js';

describe('box list-files tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-files',
        Model: 'ActionOutput_box_listfiles'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
