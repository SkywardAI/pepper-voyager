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

import { BedrockAgentRuntimeClient, RetrieveCommand } from "@aws-sdk/client-bedrock-agent-runtime";
import { BedrockRuntimeClient, ConverseCommand, ConverseStreamCommand } from "@aws-sdk/client-bedrock-runtime";

/**
 * @type { BedrockRuntimeClient? }
 */
let client = null;

/**
 * @type { BedrockAgentRuntimeClient? }
 */
let agent_client = null;

/**
 * Get result from knowledge base, send together witht the LLM inference
 * @param {String} message the message to be sent to knowledge-base query
 * @returns {Promise<String>}
 */
async function invokeKnowledgeBase(message) {
    const input = {
        knowledgeBaseId: process.env.KNOWLEDGE_BASE_ID,
        retrievalQuery: {
            text: message
        },
        retrievalConfiguration: {
            vectorSearchConfiguration: {
                numberOfResults: 2,
            }
        }
    }

    const retrieval_command = new RetrieveCommand(input);
    const kb_resp = await agent_client.send(retrieval_command);
    return JSON.stringify(kb_resp)
}

/**
 * Initialize or Re-initialize the bedrock runtime client in given region.
 */
export function rebuildBedrockClient() {
    client = new BedrockRuntimeClient({region: process.env.REGION || 'ap-southeast-2'})
    agent_client = new BedrockAgentRuntimeClient({region: process.env.KB_REGION || 'ap-southeast-2'})
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

    if(messages.findIndex(({role})=>role === 'assistant') === -1) {
        rebuildBedrockClient();
    }

    const normal_messages = [];
    const system_messages = [];

    let last_role;
    messages.forEach(e=>{
        const {role, content} = e;
        if(/^(user|assistant)$/.test(role)) {
            role === last_role && normal_messages.pop();
            last_role = role;
            normal_messages.push(e)
        } else if(role === 'system') {
            system_messages.push(content[0])
        }
    })

    // add knowledge base result
    if(process.env.INVOKE_KB && process.env.KNOWLEDGE_BASE_ID) {
        const kb_resp_content = await invokeKnowledgeBase(messages.pop().content[0].text);
        normal_messages[normal_messages.length - 1].content.unshift({ text: kb_resp_content })
    }

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