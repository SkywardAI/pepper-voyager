import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * @type { BedrockRuntimeClient? }
 */
let client = null;

/**
 * Initialize or Re-initialize the bedrock runtime client in given region.
 */
export function rebuildBedrockClient() {
    client = new BedrockRuntimeClient({
        region: process.env.REGION || 'ap-southeast-2'
    })
}

/**
 * @callback InferenceCallback
 * @param {String} text_piece Piece of text
 * @param {Boolean} finished indicate whether response finished or not
 */

/**
 * @typedef MessageContent
 * @property {String} text text of the content 
 */

/**
 * @typedef Message
 * @property {"user"|"assistant"} role
 * @property {MessageContent[]} content
 */

/**
 * @typedef Settings
 * @property {Boolean} stream Whether response in stream or not
 * @property {Number} max_tokens The max tokens response can have
 * @property {Number} top_p Top P of the request
 * @property {Number} temperature Temperature of the request
 */

/**
 * Do inference with AWS Bedrock
 * @param {Message[]} messages messages to inference
 * @param {Settings} settings 
 * @param {InferenceCallback} cb 
 * @returns {Promise<String>} the whole response text no matter stream or not
 */
export async function inference(messages, settings, cb = null) {
    if(!client) rebuildBedrockClient();

    const { top_p, temperature, max_tokens } = settings;

    const input = {
        modelId: process.env.MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
        messages,
        inferenceConfig: {
            maxTokens: max_tokens || 2048,
            temperature: temperature || 0.7, 
            topP: top_p || 0.9
        }
    }

    let command;
    if(settings.stream) command = new ConverseStreamCommand(input);
    else command = new ConverseCommand(input);

    const response = await client.send(command);

    let response_text;
    if(settings.stream) {
        for await (const resp of response.stream) {
            if(resp.contentBlockDelta) {
                const text_piece = resp.contentBlockDelta.delta.text;
                response_text += text_piece;
                cb && cb(text_piece, false);
            }
        }
        cb && cb('', true)
    } else {
        response_text = response.output.message.content[0].text;
        cb && cb(response_text, true)
    }

    return response_text;
}