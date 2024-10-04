# VOYAGER
[Voyager](https://github.com/skywardai/voyager) specially build for Pepper Robot Chatbot. Check also [pepper-chatbot](https://github.com/cbh778899/pepper-chatbot).

## BUILD & RUN
> This application has interacting with AWS Resources, and it's build specificially inside an EC2 or ECS, if using outside the environments you might need to install `aws-cli` to config the identifications.

> Make sure you have installed `docker`, `docker compose` and `make` on machine unless you are using containers like ECS.

To build and run, simply run command
```sh
make up
# OR
make dev # for development setup. Using this command also requires run
npm install pnpm && pnpm install # To install dependencies
# Also you can use any package manager you perfer
```

## Routes
### Healthy
#### Route
`/healthy`
#### Description
The route to check container healthy status
#### Example Usage
```http
GET /healthy HTTP/1.1
```
#### Example Response
```
ok
```
### Chat Completions
#### Route
`/v1/chat/completions`
#### Description
The route for inference connected to AWS Bedrock service. Request and response in OpenAI format.
#### Example Usage
```http
POST /v1/chat/completions HTTP/1.1
Content-Type: application/json

{
    "messages": [
        { "role": "system", "content": "You are an assistant named Pepper helps users answer their questions" },
        { "role": "user", "content": "Hello" }
    ],
    "max_tokens": 50,
    "model": "anthropic.claude-3-sonnet-20240229-v1:0"
}
```
#### Example Response
```
{
  "id": "<random-id>",
  "object": "chat.completion",
  "created": 1728021450456,
  "model": "anthropic.claude-3-sonnet-20240229-v1:0",
  "system_fingerprint": "<random-fp>",
  "choices": [
    {
      "index": 0,
      "message": [
        {
          "role": "assistant",
          "content": "Hi!"
        }
      ],
      "logprobs": null,
      "finish_reason": 'stop'
    }
  ],
  "usage": {
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "total_tokens": 0
  }
}
```
### Speech Recognition
#### Route
`/v1/speech/recognition`
#### Description
The route for speech recognition, backend is Azure Speech Services, requires key and region of Azure. See [Azure Speech Recognition](#azure-speech-recognition) part.
#### Example Usage
```http
POST /v1/speech/recognition HTTP/1.1
Content-Type: audio/wav

# <audio buffer which content is "hello world">
```
#### Example Response
```
{
  "text": "hello world!"
}
```
> If there are any error occurs, you will receive
```
{
    "error": <the error object>
}
```
## Azure Speech Recognition
> To set up the azure speech recognition service, you need to create your own service on Azure portal and your key and region ready.

Create a file named `.env.azure` and fill your key and region:
```
AZURE_SPEECH_KEY=<your-aws-speech-sercive-key>
AZURE_SPEECH_REGION=<your-aws-speech-sercive-region>
```
The app will load it automatically.