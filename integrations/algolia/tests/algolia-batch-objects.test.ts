import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/batch-objects.js';

describe('algolia batch-objects tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'batch-objects',
        Model: 'ActionOutput_algolia_batchobjects'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
