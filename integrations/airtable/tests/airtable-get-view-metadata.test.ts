import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-view-metadata.js';

describe('airtable get-view-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-view-metadata',
        Model: 'ActionOutput_airtable_getviewmetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
