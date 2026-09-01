import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-campfire-uploads.js';

describe('basecamp list-campfire-uploads tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-campfire-uploads',
        Model: 'ActionOutput_basecamp_listcampfireuploads'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
