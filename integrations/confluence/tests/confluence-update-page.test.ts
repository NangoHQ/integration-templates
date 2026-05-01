import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-page.js';

describe('confluence update-page tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-page',
        Model: 'ActionOutput_confluence_updatepage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
