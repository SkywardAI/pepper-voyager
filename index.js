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

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from "https"
import { configDotenv } from 'dotenv';

// import { initDB } from './database/index.js';
import buildRoutes from './routes/index.js'

// import { loadDefaultDataset } from './tools/plugin.js';
// import { loadDataset } from './database/rag-inference.js';
import { readFileSync } from 'fs';

configDotenv()
configDotenv({path: ".env.production", override:true})

// const force_load = false;
// await initDB(force_load)
// if(+process.env.LOAD_DEFAULT_DATASET) {
//     const loader = await loadDataset(process.env.DEFAULT_DATASET_NAME || "production_dataset", force_load)
//     loader && await loader(await loadDefaultDataset())
// }

const app = express();
app.use(cors({origin: process.env.ALLOW_ORIGIN || '*'}));
app.use(bodyParser.json());

buildRoutes(app);

const PORT = process.env.APP_PORT || 8000
if(
    +process.env.ENABLE_HTTPS &&
    !process.env.HTTPS_KEY_PATH.startsWith("*") &&
    !process.env.HTTPS_CERT_PATH.startsWith("*")
) {
    const ssl_options = {
        key: readFileSync(process.env.HTTPS_KEY_PATH),
        cert: readFileSync(process.env.HTTPS_CERT_PATH)
    }
    if(process.env.HTTPS_CA_PATH && !process.env.HTTPS_CA_PATH.startsWith("*")) {
        ssl_options.ca = readFileSync(process.env.HTTPS_CA_PATH);
    }
    createServer(ssl_options, app).listen(PORT, '0.0.0.0', () => {
        console.log(`VOYAGER is running on port ${PORT}, happy sailing!`)
    })
} else {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`VOYAGER is running on port ${PORT}, happy sailing!`)
    })
}