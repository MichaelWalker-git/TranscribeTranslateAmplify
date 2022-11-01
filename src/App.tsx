import React, {useEffect, useState} from "react";
import {Amplify, Auth, API, graphqlOperation} from "aws-amplify";

import {
    AmplifyProvider,
    Authenticator,
    Flex,
    View,
} from "@aws-amplify/ui-react";
import aws_exports from "./aws-exports";

import * as TranslateClient from "./components/TranslationClient";
import {ICredentials} from "@aws-amplify/core";
import MicrophoneStream from "microphone-stream";
import {TranscribeStreamingClient} from "@aws-sdk/client-transcribe-streaming";

import "@aws-amplify/ui-react/styles.css";
import theme from "./theme";
import {onCreateTodo} from "./graphql/subscriptions";
import {todosByDate} from "./graphql/queries";
import {TranslationComponent} from "./components/TranslationComponent";
import {ITranslatedInput, TranscriptionComponent} from "./components/TranscriptionComponent";
// import {
//     PollyClient,
//     SynthesizeSpeechCommand,
//     SynthesizeSpeechCommandInput,
//     SynthesizeSpeechCommandOutput
// } from "@aws-sdk/client-polly";

window.Buffer = window.Buffer || require("buffer").Buffer;

Amplify.configure(aws_exports);

const App = () => {
    const [selectedLanguage, setSelectedLanguage] = React.useState("");
    const [transcribedText, setTranscribedText] = React.useState<ITranslatedInput[]>([]);
    const [translatedText, setTranslatedText] = React.useState("");
    const [targetLanguage, setTargetLanguage] = React.useState("");
    // const [translationLanguageList, setTranslationLanguageList] = React.useState("");
    const [userCredentials, setUserCredentials] = React.useState<ICredentials>();
    const [transcriptionClient, setTranscriptionClient] = React.useState<TranscribeStreamingClient>();
    const [microphoneStream, setMicrophoneStream] = React.useState<MicrophoneStream>();
    const [audioContext, setAudioContext] = useState<AudioContext>();

    const fetchMessages = async () => {
        const messagesData = await API.graphql(
            graphqlOperation(todosByDate, {
                sortDirection: 'DESC',
                limit: 200,
                type: "meetingTranscript",
            })
        );
        // @ts-ignore
        console.log(messagesData?.data.item)
        // @ts-ignore
        setTranscribedText(messagesData.data.todosByDate.items);
    };

    const speakOutLoud = async (inputText: string) => {
        // const client = new PollyClient({region: "us-east-1"});
        //
        // const params: SynthesizeSpeechCommandInput = {
        //     OutputFormat: 'mp3',
        //     Text: inputText,
        //     VoiceId: 'Joanna'
        // };
        //
        // const command = new SynthesizeSpeechCommand(params)
        //
        // try {
        //     const data: SynthesizeSpeechCommandOutput = await client.send(command);
        //     const source = audioContext?.createBufferSource();
        //     // if(data.SynthesisTask){
        //     //     source.buffer = await audioContext?.decodeAudioData(data.AudioStream.transformToByteArray())
        //     //
        //     // }
        // } catch (error) {
        //     // error handling.
        // } finally {
        //     // finally.
        // }
    }

    useEffect(() => {
        fetchMessages();
        setAudioContext(new AudioContext());

    }, []);

    useEffect(() => {
        const getUserInfo = async (): Promise<ICredentials> => {
            return await Auth.currentCredentials();
        };

        getUserInfo().then((amplifyUserInterface) => {
            setUserCredentials(amplifyUserInterface);
        })
    }, [])

    useEffect(() => {
        const onCreateNewMsg = API.graphql(
            graphqlOperation(onCreateTodo)
        ) as any;

        onCreateNewMsg.subscribe({
            next: () => {
                // const newMsg = data.value.data.onCreateMessage;
                // if (newMsg.chatRoomID !== route.params.id) {
                //     console.log('Message is in another room!');
                //     return;
                // }
                fetchMessages();
                //Use Polly to speak language out loud

            },
        });

        return () => {
            if (onCreateNewMsg && onCreateNewMsg?.unsubscribe) {
                onCreateNewMsg.unsubscribe();
            }
        }

    }, [])


    const translateText = async () => {
        const aggTranslatedText = transcribedText
            .reduce((acc, curr) => `${acc} | ${curr.transcript}`, '')
        if (aggTranslatedText.length === 0) {
            alert("No text to translate!");
            return;
        }
        if (targetLanguage === "") {
            alert("Please select a language to translate to!");
            return;
        }
        try {
            if (userCredentials) {
                const translation: string = await TranslateClient.translateTextToLanguage(
                    aggTranslatedText,
                    targetLanguage,
                    userCredentials
                );
                if (translation) {
                    setTranslatedText(translation);
                    // remap this string to the original conversation
                    const splitValues = translation.split("|");
                    splitValues.shift();
                    const withTranslation = transcribedText.map((orig, index) => {
                        return {
                            ...orig,
                            translatedText: splitValues[index]
                        }
                    });
                    setTranscribedText(withTranslation);
                    console.log(translation, "translation");
                }
            } else {
                alert("No user credentials")
            }
        } catch (error: any) {
            alert("There was an error translating the text: " + error.message);
        }
    };

    const clearTranscription = () => {
        // setTranscribedText([])
        setTranslatedText("")
    };

    const handleTranslationLanguageList = (event: React.ChangeEvent<HTMLSelectElement>) => {
        console.log("handleTranslationLanguageList", event.target.value);
        setTargetLanguage(event.target.value);
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
                                <TranscriptionComponent
                                    selectedLanguage={selectedLanguage}
                                    handleInputLanguageList={handleInputLanguageList}
                                    userCredentials={userCredentials}
                                    transcribedText={transcribedText}
                                    setMicrophoneStream={setMicrophoneStream}
                                    setTranscriptionClient={setTranscriptionClient}
                                    transcriptionClient={transcriptionClient}
                                    microphoneStream={microphoneStream}/>
                                <TranslationComponent clearTranscription={clearTranscription}
                                                      translateText={translateText}
                                                      targetLanguage={targetLanguage}
                                                      handleTranslationLanguageList={handleTranslationLanguageList}/>
                            </div>
                        </View>
                    </Flex>
                )}
            </Authenticator>
        </AmplifyProvider>
    );
};

export default App;
