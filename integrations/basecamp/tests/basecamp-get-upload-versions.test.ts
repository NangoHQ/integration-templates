import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/get-upload-versions.js';

describe('basecamp get-upload-versions tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'get-upload-versions',
        Model: 'ActionOutput_basecamp_getuploadversions'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should omit email_address when the provider returns it as null for the creator', async () => {
        const nullEmailMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'get-upload-versions-null-email',
            Model: 'ActionOutput_basecamp_getuploadversions'
        });

        const input = await nullEmailMock.getInput();
        const response = await createAction.exec(nullEmailMock, input);
        const output = await nullEmailMock.getOutput();

        expect(response).toEqual(output);
    });
});
