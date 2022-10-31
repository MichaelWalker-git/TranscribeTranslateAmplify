import { TranscribeStreamingClient } from "@aws-sdk/client-transcribe-streaming";
import MicrophoneStream from "microphone-stream";
import { StartStreamTranscriptionCommand } from "@aws-sdk/client-transcribe-streaming";
import {ICredentials} from "@aws-amplify/core";

const SAMPLE_RATE = 44100;

export const startRecording = async (language: string, callback: any, userCredential: ICredentials) => {
    if (!language) {
        return false;
    }
    const transcribeClient = new TranscribeStreamingClient({
        region: "us-east-1",
        credentials: userCredential,
    });
    const microphoneStream =  await createMicrophoneStream();
    return await startStreaming(language, microphoneStream, transcribeClient, callback);
};

export const stopRecording = function (microphoneStream: MicrophoneStream, transcribeClient: TranscribeStreamingClient) {
    if (microphoneStream) {
        console.log("stopRecording - microphoneStream", microphoneStream)
        microphoneStream.stop();
    }
    if (transcribeClient) {
        transcribeClient.destroy();
    }
};

const createMicrophoneStream = async (): Promise<MicrophoneStream> => {
    let mediaStream: MediaStream | null = null;
    try {
        mediaStream = await window.navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
        });
    } catch (e) {
        console.error(e);
    }
    const microphoneStream = mediaStream ? new MicrophoneStream(
        {
            stream: mediaStream,
            objectMode: false
        }
    ) : new MicrophoneStream();
    console.log("inside - createMicrophoneStream - microphoneStream", microphoneStream);
    console.log("inside - after - createMicrophoneStream - microphoneStream", microphoneStream);
    return microphoneStream;
}

const startStreaming = async (language: string,
                              microphoneStream: MicrophoneStream,
                              transcribeClient: TranscribeStreamingClient, callback: any) => {
    const audioStream =  await getAudioStream(microphoneStream);
    console.log(audioStream, "audioStream")

    const command = new StartStreamTranscriptionCommand({
        LanguageCode: language,
        MediaEncoding: "pcm",
        MediaSampleRateHertz: SAMPLE_RATE,
        AudioStream: audioStream,
    });
    const data = await transcribeClient.send(command);

    if(data.TranscriptResultStream){
        for await (const event of data?.TranscriptResultStream) {
            if(event?.TranscriptEvent?.Transcript){
                for (const result of event?.TranscriptEvent?.Transcript.Results || []) {
                    if (result.IsPartial === false) {
                        if(result?.Alternatives && result?.Alternatives[0].Items) {
                            const noOfResults = result?.Alternatives[0].Items?.length;
                            console.log("Items" , result?.Alternatives[0].Items);
                            let wholeSentence = ``;
                            for (let i = 0; i < noOfResults; i++) {
                                wholeSentence += ` ${result?.Alternatives[0].Items[i].Content}`;
                            }
                            console.log("wholeSentence", wholeSentence);
                            callback(wholeSentence, transcribeClient, microphoneStream);
                        }
                    }
                }
            }
        }
    }
}

const pcmEncode = (input: Float32Array) => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return buffer;
};


const getAudioStream = async function* (microphoneStream: MicrophoneStream) {
    const pcmEncodeChunk = (audioChunk: Buffer) => {
        const raw = MicrophoneStream.toRaw(audioChunk);
        if (raw === null) {
            return;
        }
        return Buffer.from(pcmEncode(raw));
    };
    console.log(microphoneStream, "microphoneStream inside getAudioStream");

    // @ts-ignore
    for await (const chunk of microphoneStream) {
        if (chunk.length <= SAMPLE_RATE) {
            yield {
                AudioEvent: {
                    AudioChunk: pcmEncodeChunk(chunk),
                },
            };
        }
    }
};
