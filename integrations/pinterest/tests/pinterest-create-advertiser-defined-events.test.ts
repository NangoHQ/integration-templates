import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-advertiser-defined-events.js';

describe('pinterest create-advertiser-defined-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-advertiser-defined-events',
        Model: 'ActionOutput_pinterest_createadvertiserdefinedevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
