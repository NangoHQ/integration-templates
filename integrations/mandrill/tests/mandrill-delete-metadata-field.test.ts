import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/delete-metadata-field.js';

describe('mandrill delete-metadata-field tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'delete-metadata-field',
        Model: 'ActionOutput_mandrill_deletemetadatafield'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });
});
