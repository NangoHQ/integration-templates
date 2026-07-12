import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-advertiser-defined-events.js';

describe('pinterest list-advertiser-defined-events tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-advertiser-defined-events',
        Model: 'ActionOutput_pinterest_listadvertiserdefinedevents'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
