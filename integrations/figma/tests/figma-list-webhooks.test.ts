import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-webhooks.js';

describe('figma list-webhooks tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-webhooks',
        Model: 'ActionOutput_figma_listwebhooks'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
