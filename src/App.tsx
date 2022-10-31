import React, {useEffect} from "react";
import {Amplify, Auth, API, graphqlOperation} from "aws-amplify";

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
import {createTodo} from "./graphql/mutations";
import {CreateTodoInput} from "./API";
import {CognitoUser} from "amazon-cognito-identity-js";
import {onCreateTodo} from "./graphql/subscriptions";
import {GraphQLSubscription, GraphQLQuery} from "@aws-amplify/api";
import {listTodos, todosByDate} from "./graphql/queries";
import {TranslationComponent} from "./components/TranslationComponent";
import {TranscriptionComponent} from "./components/TranscriptionComponent";

window.Buffer = window.Buffer || require("buffer").Buffer;

Amplify.configure(aws_exports);

const App = () => {
    const [selectedLanguage, setSelectedLanguage] = React.useState("");
    const [transcribedText, setTranscribedText] = React.useState<CreateTodoInput[]>([]);
    const [translatedText, setTranslatedText] = React.useState("");
    const [targetLanguage, setTargetLanguage] = React.useState("");
    const [translationLanguageList, setTranslationLanguageList] = React.useState("");
    const [userCredentials, setUserCredentials] = React.useState<ICredentials>();
    const [transcriptionClient, setTranscriptionClient] = React.useState<TranscribeStreamingClient>();
    const [microphoneStream, setMicrophoneStream] = React.useState<MicrophoneStream>();

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

    useEffect(() => {
        fetchMessages();
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
            },
        });

        return () => {
            if (onCreateNewMsg && onCreateNewMsg?.unsubscribe) {
                onCreateNewMsg.unsubscribe();
            }
        }

    }, [])


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
                                                      handleTranslationLanguageList={handleInputLanguageList}/>
                            </div>
                        </View>
                    </Flex>
                )}
            </Authenticator>
        </AmplifyProvider>
    );
};

export default App;
