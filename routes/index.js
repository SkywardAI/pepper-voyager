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

import { Router } from "express";

import inferenceRoute from "./inference.js";
import speechRoute from "./speech.js";

function indexRoute() {
    const router = Router();

    router.get('/healthy', (_, res)=>{
        res.status(200).send('ok')
    })

    return router;
}

function generateAPIRouters() {
    const api_router = Router();
    api_router.use('/chat', inferenceRoute());
    api_router.use('/speech', speechRoute())
    return api_router;
}

export default function buildRoutes(app) {
    app.use('/', indexRoute());
    app.use('/v1', generateAPIRouters());
}
