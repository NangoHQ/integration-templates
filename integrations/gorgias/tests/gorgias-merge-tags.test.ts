import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/merge-tags.js';

describe('gorgias merge-tags tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'merge-tags',
        Model: 'ActionOutput_gorgias_mergetags'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
