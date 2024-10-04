import {default as sdk} from 'microsoft-cognitiveservices-speech-sdk'

/**
 * @typedef RecognitionResult
 * @property {String|undefined} text The recoginition result if was success
 * @property {Error|undefined} err The error object if there's any error occurs
 */

/**
 * The method doing stt using azure speech service
 * @param {Buffer} buffer the audio buffer extracted from type `audio/wav`
 * @returns {RecognitionResult}
 */
export default function STT(buffer) {
    return new Promise(resolve=>{
        try {
            const audioConfig = sdk.AudioConfig.fromWavFileInput(buffer);
            const speechConfig = sdk.SpeechConfig.fromSubscription(
                process.env.AZURE_SPEECH_KEY, process.env.AZURE_SPEECH_REGION
            );
            speechConfig.speechRecognitionLanguage = 'en-us'
        
            const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
            recognizer.recognizeOnceAsync(result => {
                const t = result.text
                resolve({text: t})
            }, err => {
                resolve({error: err})
            });
        } catch(error) {
            console.error(error);
            resolve({ error })
        }
    })
}