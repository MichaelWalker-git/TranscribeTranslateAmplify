import React from "react";
import {Button} from "@aws-amplify/ui-react";
import {CreateTodoInput} from "../API";
import * as TranscribeClient from "./TranscribeClient";
import MicrophoneStream from "microphone-stream";
import {TranscribeStreamingClient} from "@aws-sdk/client-transcribe-streaming";
import {ICredentials} from "@aws-amplify/core";
import {CognitoUser} from "amazon-cognito-identity-js";
import {API, Auth, graphqlOperation} from "aws-amplify";
import {createTodo} from "../graphql/mutations";

interface ITranscriptionComponentProps {
    selectedLanguage: string;
    handleInputLanguageList: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    microphoneStream: MicrophoneStream|undefined;
    transcriptionClient: TranscribeStreamingClient|undefined,
    userCredentials: ICredentials|undefined,
    setMicrophoneStream: (microphoneStream: MicrophoneStream) => void;
    setTranscriptionClient: (transcriptionClient: TranscribeStreamingClient) => void;
    transcribedText: CreateTodoInput[];
}

export function TranscriptionComponent(props: ITranscriptionComponentProps) {
    const [isRecordButtonActive, setIsRecordButtonActive] = React.useState(false);
    const [isInputLanguageListDisabled, disableInputLanguage] = React.useState(false);

    const {
        selectedLanguage,
        handleInputLanguageList,
        microphoneStream,
        transcriptionClient,
        userCredentials,
        setMicrophoneStream,
        setTranscriptionClient,
        transcribedText
    } = props;

    const stopRecording = function () {
        disableInputLanguage(false);
        if (microphoneStream && transcriptionClient) {
            TranscribeClient.stopRecording(microphoneStream, transcriptionClient);
        }
    };

    const writeTranscribedText = async (transcribedText: string) => {
        const user: CognitoUser = await Auth.currentAuthenticatedUser();
        const params: CreateTodoInput = {
            language: selectedLanguage,
            meetingId: "1",
            type: "meetingTranscript",
            speaker: user.getUsername(),
            transcript: transcribedText
        }

        return API.graphql(graphqlOperation(
            createTodo, {
                input: params
            }
        ));
    }

    const onTranscriptionDataReceived = (data: string, transcriptionClient: TranscribeStreamingClient, microphoneStream: MicrophoneStream) => {
        writeTranscribedText(data).then((response: any) => {
            console.log(response, "response from API");
            console.log(transcribedText, " transcribedText");
        });
        setMicrophoneStream(microphoneStream);
        setTranscriptionClient(transcriptionClient);
    }


    const startRecording = async () => {
        if (selectedLanguage === "") {
            alert("Please select a language");
            return;
        }
        disableInputLanguage(true);
        setIsRecordButtonActive(true);

        try {
            if (userCredentials) {
                await TranscribeClient.startRecording(
                    selectedLanguage,
                    onTranscriptionDataReceived,
                    userCredentials
                );
            } else {
                console.error("User credentials not found");
            }
        } catch (error: any) {
            alert("An error occurred while recording: " + error.message);
            stopRecording();
        }
    };



    const onRecordPress = async () => {
        if (!isRecordButtonActive) {
            await startRecording();
        } else {
            await stopRecording();
        }
    };

    return (
        <>
            <h1>Streaming Speech to Text</h1>
            <select id="inputLanguageList"
                    disabled={isInputLanguageListDisabled}
                    onChange={handleInputLanguageList}
                    value={selectedLanguage}
            >
                <option value="nan">Select the language you are going to speak</option>
                <option value="zh-CN">Chinese (simplified)</option>
                <option value="en-AU">English (Australian)</option>
                <option value="en-GB">English (British)</option>
                <option value="en-US">English (US)</option>
                <option value="fr-FR">French</option>
                <option value="fr-CA">French (Canadian)</option>
                <option value="de-DE">German</option>
                <option value="it-IT">Italian</option>
                <option value="ja-JP">Japanese</option>
                <option value="ko-KR">Korean</option>
                <option value="pt-BR">Portugese (Brazilian)</option>
                <option value="es-US">Spanish (US)</option>
            </select>

            <div id="recordButtonContainer">
                <Button id="record"
                        className={isRecordButtonActive ? "recordActive" : "recordInactive"}
                        onClick={onRecordPress}>◉ Record
                </Button>
            </div>

            <div id="outputSection">
                <div id="headerText"><h2>Transcription</h2></div>
                <div id="transcribedText">
                    {
                        transcribedText.length > 0 &&
                        transcribedText.map((resObj: CreateTodoInput) => {
                            return <div key={resObj.id} className={"transcriptionText"}>
                                <h5>
                                    {resObj.speaker}: </h5>
                                <p className={"bodyOfText"}> {resObj.transcript}</p>
                            </div>
                        })
                    }
                </div>
            </div>
        </>
    );
}