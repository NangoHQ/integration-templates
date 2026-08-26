import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/list-project-people.js';

describe('basecamp list-project-people tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'list-project-people',
        Model: 'ActionOutput_basecamp_listprojectpeople'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('should omit email_address/title/tagline/location/bio/company when the provider returns them as null', async () => {
        const nullFieldsMock = new global.vitest.NangoActionMock({
            dirname: __dirname,
            name: 'list-project-people-null-fields',
            Model: 'ActionOutput_basecamp_listprojectpeople'
        });

        const input = await nullFieldsMock.getInput();
        const response = await createAction.exec(nullFieldsMock, input);
        const output = await nullFieldsMock.getOutput();

        expect(response).toEqual(output);
    });
});
