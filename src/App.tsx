import React, {useEffect} from "react";
import {Amplify, Auth} from "aws-amplify";

import {
    AmplifyProvider,
    Authenticator,
    Button,
    Flex,
    View,
} from "@aws-amplify/ui-react";
import aws_exports from "./aws-exports";

import * as TranscribeClient from "./components/TranscribeClient";
import * as TranslateClient from "./components/TranslationClient";
import {ICredentials} from "@aws-amplify/core";
import MicrophoneStream from "microphone-stream";
import {TranscribeStreamingClient} from "@aws-sdk/client-transcribe-streaming";

import "@aws-amplify/ui-react/styles.css";
import theme from "./theme";

window.Buffer = window.Buffer || require("buffer").Buffer;

Amplify.configure(aws_exports);

const App = () => {
    const [selectedLanguage, setSelectedLanguage] = React.useState("");
    const [transcribedText, setTranscribedText] = React.useState<Array<string>>([]);
    const [translatedText, setTranslatedText] = React.useState("");
    const [targetLanguage, setTargetLanguage] = React.useState("");
    const [translationLanguageList, setTranslationLanguageList] = React.useState("");
    const [userCredentials, setUserCredentials] = React.useState<ICredentials>();
    const [transcriptionClient, setTranscriptionClient] = React.useState<TranscribeStreamingClient>();
    const [microphoneStream, setMicrophoneStream] = React.useState<MicrophoneStream>();

    const [isRecordButtonActive, setIsRecordButtonActive] = React.useState(false);
    const [isInputLanguageListDisabled, disableInputLanguage] = React.useState(false);

    useEffect(() => {
        const getUserInfo = async (): Promise<ICredentials> => {
            return await Auth.currentCredentials();
        };

        getUserInfo().then((amplifyUserInterface) => {
            setUserCredentials(amplifyUserInterface);
        })
    }, [])

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


    const onTranscriptionDataReceived = (data: string, transcriptionClient: TranscribeStreamingClient, microphoneStream: MicrophoneStream) => {
        console.log("data  ", data);
        console.log(transcribedText, " transcribedText");
        setTranscribedText([...transcribedText, data]);
        setMicrophoneStream(microphoneStream);
        setTranscriptionClient(transcriptionClient);
    }

    const stopRecording = function () {
        disableInputLanguage(false);
        if (microphoneStream && transcriptionClient) {
            TranscribeClient.stopRecording(microphoneStream, transcriptionClient);
        }
    };

    const translateText = async () => {
        const sourceText = transcribedText;
        if (sourceText.length === 0) {
            alert("No text to translate!");
            return;
        }
        if (translationLanguageList === "") {
            alert("Please select a language to translate to!");
            return;
        }
        try {
            if (userCredentials) {
                const wholeSentence = sourceText.join(" ");
                const translation = await TranslateClient.translateTextToLanguage(
                    wholeSentence,
                    targetLanguage,
                    userCredentials
                );
                if (translation) {
                    setTranslatedText(translation);
                }
            } else {
                alert("No user credentials")
            }
        } catch (error: any) {
            alert("There was an error translating the text: " + error.message);
        }
    };

    const clearTranscription = () => {
        setTranscribedText([])
        setTranslatedText("")
    };

    const handleTranslationLanguageList = (event: React.ChangeEvent<HTMLSelectElement>) => {
        console.log("handleTranslationLanguageList", event.target.value);
        setTranslationLanguageList(event.target.value);
    }
    const handleInputLanguageList = (event: React.ChangeEvent<HTMLSelectElement>) => {
        console.log("handleInputLanguageList", event.target.value);
        setSelectedLanguage(event.target.value);
    }


    return (
        <AmplifyProvider theme={theme}>
            <Authenticator>
                {({signOut, user}) => (
                    <Flex
                        direction="column"
                        justifyContent="flex-start"
                        alignItems="center"
                        alignContent="flex-start"
                        wrap="nowrap"
                        gap="1rem"
                        textAlign="center"
                    >

                        <View width="100%">
                            <div id="mainContainer">
                                <h1>Streaming Speech to Text</h1>
                                <select id="inputLanguageList"
                                        disabled={isInputLanguageListDisabled}
                                        onChange={handleInputLanguageList}
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
                                            transcribedText.length > 0 && <div>
                                                {transcribedText.join(" ")}
                                            </div>
                                        }
                                    </div>

                                    {/*<div id="headerText"><h2>Translation</h2></div>*/}
                                    {/*<div id="translatedText"></div>*/}
                                </div>
                            </div>
                        </View>
                    </Flex>
                )}
            </Authenticator>
        </AmplifyProvider>
    );
};

export default App;
