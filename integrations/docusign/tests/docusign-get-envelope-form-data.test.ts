import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-envelope-form-data.js';

describe('docusign get-envelope-form-data tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-envelope-form-data',
        Model: 'ActionOutput_docusign_getenvelopeformdata'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
