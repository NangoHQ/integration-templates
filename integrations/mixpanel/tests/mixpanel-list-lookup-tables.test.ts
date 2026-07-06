import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-lookup-tables.js';

describe('mixpanel list-lookup-tables tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-lookup-tables',
        Model: 'ActionOutput_mixpanel_listlookuptables'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
