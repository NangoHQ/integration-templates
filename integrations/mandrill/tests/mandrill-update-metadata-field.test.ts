import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/update-metadata-field.js';

describe('mandrill update-metadata-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'update-metadata-field',
        Model: 'ActionOutput_mandrill_updatemetadatafield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
