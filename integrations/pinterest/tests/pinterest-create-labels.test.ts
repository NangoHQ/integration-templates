import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-labels.js';

describe('pinterest create-labels tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-labels',
        Model: 'ActionOutput_pinterest_createlabels'
    });

    it('should throw when Pinterest reports a label creation error instead of returning the rejected label as a success', async () => {
        const input = await nangoMock.getInput();

        await expect(createAction.exec(nangoMock, input)).rejects.toThrow();
    });
});
