import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/add-metadata-field.js';

describe('mandrill add-metadata-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'add-metadata-field',
        Model: 'ActionOutput_mandrill_addmetadatafield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
