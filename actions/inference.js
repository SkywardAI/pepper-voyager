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

// import { formatOpenAIContext } from "../tools/formatContext.js";
import { generateFingerprint } from "../tools/generator.js";
// import { post } from "../tools/request.js";
// import { searchByMessage } from "../database/rag-inference.js";
// import { userMessageHandler } from "../tools/plugin.js";
import { extractAPIKeyFromHeader, extractAPIKeyFromRequest, validateAPIKey } from "../tools/apiKey.js";
import { inference, rebuildBedrockClient } from "./bedrock.js";

/**
 * Generates a response content object for chat completion.
 *
 * @param {string} id - The unique identifier for the response.
 * @param {string} object - The type of the response object (e.g., 'chat.completion').
 * @param {string} model - The model used for generating the response.
 * @param {string} system_fingerprint - The system fingerprint used to identify the current system state.
 * @param {boolean} stream - Indicates whether the response is streamed or not.
 * @param {string} content - The generated content for the response.
 * @param {boolean} stopped - Indicates if the response generation was stopped.
 * @returns {Object} The response content object.
 */
function generateResponseContent(
  id,
  object,
  model,
  system_fingerprint,
  stream,
  content,
  stopped
) {
  const resp = {
    id,
    object,
    created: Date.now(),
    model,
    system_fingerprint,
    choices: [
      {
        index: 0,
        [stream ? "delta" : "message"]: {
          role: "assistant",
          content,
        },
        logprobs: null,
        finish_reason: stopped ? "stop" : null,
      },
    ],
  };
  if (!stream) {
    resp.usage = {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
    };
  }
  return resp;
}

function retrieveData(req_header, req_body) {
    // retrieve api key
    const api_key = extractAPIKeyFromHeader(req_header);
    if(!validateAPIKey(api_key)) {
        return { error: true, status: 401, message: "Not Authorized" }
    }

    // get attributes required special consideration
    let { messages, ...request_body } = req_body;

    // validate messages
    if(!messages || !messages.length) {
        return { error: true, status: 422, message: "Messages not given!" }
    }

    // format what AWS Bedrock SDK can recognize
    messages = messages.map(({role, content})=>{
        return { role, content: [{text: content}] }
    })

    // generated fields
    const system_fingerprint = generateFingerprint();
    const model = request_body.model || process.env.LANGUAGE_MODEL_NAME


    return { error: false, body: {request_body, messages, api_key, system_fingerprint, model} }

}

/**
 * Handles a chat completion request, generating a response based on the input messages.
 *
 * @async
 * @param {Request} req - The HTTP request object.
 * @param {Response} res - The HTTP response object.
 * @returns {Promise<void>} A promise that resolves when the response is sent.
 */
export async function chatCompletion(req, res) {
    const {error, body, status, message} = retrieveData(req.headers, req.body);
    if(error) {
        res.status(status).send(message);
        return;
    }

    const { api_key, model, system_fingerprint, request_body, messages } = body
    const isStream = !!request_body.stream;

    if(isStream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Accel-Buffering", "no");
        res.setHeader("Connection", "Keep-Alive");
    }

    inference(messages, request_body, (text_piece, finished) => {
        if(isStream) {
            res.write(JSON.stringify(
                generateResponseContent(
                    api_key, 'chat.completion.chunk', model, system_fingerprint, isStream, text_piece, finished
                )
            )+'\n\n');
            if(finished) res.end();
        } else {
            res.send(generateResponseContent(
                api_key, 'chat.completion', model, system_fingerprint,
                isStream, text_piece, true
            ))
        }
    })
}

// no need currently
export async function resetChat(req, res) {
    if(!validateAPIKey(extractAPIKeyFromRequest(req))) {
        res.status(401).send('Not Authorized')
        return;
    }

	rebuildBedrockClient();
	res.status(200).send({status:'ok'})
}