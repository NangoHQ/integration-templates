import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/copy-index.js';

describe('algolia copy-index tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'copy-index',
        Model: 'ActionOutput_algolia_copyindex'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
