import {default as sdk} from 'microsoft-cognitiveservices-speech-sdk'

export default function STT(buffer) {
    return new Promise(resolve=>{
        const audioConfig =  sdk.AudioConfig.fromWavFileInput(buffer);
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
    })
}