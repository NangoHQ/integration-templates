import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-sharing-metadata.js';

describe('coda get-sharing-metadata tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-sharing-metadata',
        Model: 'ActionOutput_coda_getsharingmetadata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
