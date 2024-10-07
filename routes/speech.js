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

import STT from "../actions/azure-speech.js";
import bodyParser from 'body-parser';
import { Router } from "express";
import { extractAPIKeyFromRequest, validateAPIKey } from "../tools/apiKey.js";


/**
 * call speech to text service on azure
 * @param {Request} req
 * @param {Response} res
 */
async function SpeechToText(req, res) {
    if(!validateAPIKey(extractAPIKeyFromRequest(req))) {
        res.status(401).send('Not Authorized')
        return;
    }
    const buffer = req.body;
    const resp = await STT(buffer);
    res.setHeader('Content-Type', 'application/json')
    res.send(resp)
}
export default function speechRoute() {
    const router = Router();
    
    router.post('/recognition', bodyParser.raw({ type: 'audio/wav', limit: '10mb' }), SpeechToText);

    return router;
}