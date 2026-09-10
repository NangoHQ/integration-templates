import { vi, expect, it, describe } from 'vitest';

import createAction from '../actions/create-image.js';

describe('openai create-image tests', () => {
    const nangoMock = new global.vitest.NangoActionMock({
        dirname: __dirname,
        name: 'create-image',
        Model: 'ActionOutput_openai_createimage'
    });

    it('should output the action output that is expected', async () => {
        const input = await nangoMock.getInput();
        const response = await createAction.exec(nangoMock, input);
        const output = await nangoMock.getOutput();

        expect(response).toEqual(output);
    });

    it('only exposes the current GPT Image request contract', () => {
        expect(
            createAction.input.safeParse({
                prompt: 'A red circle on a white background',
                model: 'gpt-image-1',
                output_format: 'webp'
            }).success
        ).toBe(true);
        expect(
            createAction.input.safeParse({
                prompt: 'A red circle on a white background',
                model: 'dall-e-3',
                response_format: 'url'
            }).success
        ).toBe(false);

        const schema = createAction.input.toJSONSchema();
        expect(schema.properties).not.toHaveProperty('response_format');
        expect(schema.properties).not.toHaveProperty('style');
    });
});
