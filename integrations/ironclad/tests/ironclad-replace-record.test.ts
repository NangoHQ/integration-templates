import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/replace-record.js';

describe('ironclad replace-record tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'replace-record',
        Model: 'ActionOutput_ironclad_replacerecord'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
