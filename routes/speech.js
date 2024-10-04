import STT from "../actions/azure-speech.js";
import bodyParser from 'body-parser';

/**
 * call speech to text service on azure
 * @param {Request} req
 * @param {Response} res
 */
async function SpeechToText(req, res) {
    const buffer = req.body;
    const resp = await STT(buffer);
    res.setHeader('Content-Type', 'application/json')
    res.send(resp)
}

import { Router } from "express";

export default function speechRoute() {
    const router = Router();
    
    router.post('/recognition', bodyParser.raw({ type: 'audio/wav', limit: '10mb' }), SpeechToText);

    return router;
}