// coding=utf-8

// Copyright [2024] [SkywardAI]
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at

//        http://www.apache.org/licenses/LICENSE-2.0

// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { readdir, readFile } from 'fs/promises'

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
 * @property {"user"|"assistant"|"system"} role
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

    if(process.env.LOAD_SRC && messages.findIndex(({role})=>role === 'assistant') === -1) {
        const idx = messages.findIndex(({role})=>role === 'user');
        const base_url = import.meta.url;
        try {
            const files = (
                await readdir(new URL('./src', base_url))
            // max 5 files in a bedrock conversation
            ).slice(0, 5)
            for(const f of files) {
                const parts = f.split('.')
                const extension = parts.pop();
                const file_name = parts.join('_')
                const file_buffer = await readFile(new URL(`./src/${f}`, base_url))
                messages[idx].content.push({ 
                    format: extension.toLowerCase(), 
                    name: file_name, 
                    source: {bytes: file_buffer} 
                })
            }
        } catch(error) {
            console.error(error)
        }
    }

    const normal_messages = [];
    const system_messages = [];
    messages.forEach(e=>{
        const {role, content} = e;
        if(role === 'assistant' || role === 'user') {
            normal_messages.push(e)
        } else if(role === 'system') {
            system_messages.push(content[0])
        }
    })

    const { top_p, temperature, max_tokens } = settings;

    const input = {
        modelId: process.env.MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
        messages: normal_messages,
        inferenceConfig: {
            maxTokens: max_tokens || 2048,
            temperature: temperature || 0.7, 
            topP: top_p || 0.9
        }
    }

    if(system_messages.length) input.system = system_messages

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