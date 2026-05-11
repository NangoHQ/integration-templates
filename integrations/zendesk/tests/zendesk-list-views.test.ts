import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-views.js';

describe('zendesk list-views tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-views',
        Model: 'ActionOutput_zendesk_listviews'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
