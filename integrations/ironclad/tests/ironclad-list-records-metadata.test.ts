import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-records-metadata.js';

describe('ironclad list-records-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-records-metadata',
        Model: 'ActionOutput_ironclad_listrecordsmetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
