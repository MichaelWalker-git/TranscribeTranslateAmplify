import React, {useEffect, useState} from "react";
import {Amplify, API, graphqlOperation, Storage} from "aws-amplify";
import {
  AmplifyProvider,
  Authenticator,
  Button,
  Flex,
  Text,
  View,
} from "@aws-amplify/ui-react";
import {useReactMediaRecorder} from "react-media-recorder";
import {v4 as uuid} from 'uuid';

import aws_exports from "./aws-exports";

import "@aws-amplify/ui-react/styles.css";
import theme from "./theme";
import {createTranslationRecordings, startTranslationSfn} from "./graphql/mutations";
import {CreateTranslationRecordingsInput} from "./API";
import {listTranslationRecordings} from "./graphql/queries";
import {onUpdateTranslationRecordings} from "./graphql/subscriptions";

Amplify.configure(aws_exports);

const bucket = aws_exports.aws_user_files_s3_bucket || 'amplify-audiotoawss3-dev-133151-deployment';
const region = aws_exports.aws_user_files_s3_bucket_region || 'us-east-1';

interface subscriptionParams  { provider: any, value: any }

const App = () => {
  const [sourceLanguage, setSourceLanguage] = useState('en-US');
  const [file, updateFile] = useState<File>()
  const [recordingName, updateRecordingName] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('es-ES');
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, updateRecordings] = useState([])
  const [transcription, updateTranscription] = useState('');
  const [translation, updateTranslation] = useState('');
  const [currMediaBlobUrl, setCurrMediaBlobUrl] = useState('');

  useEffect(() => {
    const sub =  API.graphql(
        graphqlOperation(onUpdateTranslationRecordings)
    );
    // @ts-ignore
    sub.subscribe({
      next: (params: subscriptionParams) => {
        if(params.value.data.onUpdateTranslationRecordings.transcription) {
          const {transcription, translatedText, pollyLocation} = params.value.data.onUpdateTranslationRecordings;
            if(transcription){
              updateTranscription(transcription);
            }

          if (translatedText) {
            updateTranslation(translatedText);
          }

          if (pollyLocation) {
            getPollyFile(pollyLocation);
          }
        }
      },
      error: (error: any) => console.warn(error)
    });
  }, []);

  async function getPollyFile(pollyLocation: string) {
    const file = await Storage.get(pollyLocation, {download: true});
    const blob = file.Body;
    // @ts-ignore
    const mediaBlobUrl = URL.createObjectURL(blob);
    setCurrMediaBlobUrl(mediaBlobUrl);
  }

  async function pushRecordingToCloud(fileBlob: File) {
    if (fileBlob) {
      const key = `${uuid()}${recordingName}.wav`;

      const recordingInput: CreateTranslationRecordingsInput = {
        jobId: key,
        bucket: bucket,
        key: `raw_input/${key}`,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage,
      }

      try {
        await Storage.put(
            key,
            fileBlob,
            {
            contentType: 'audio/webm',
              customPrefix: {
                public: 'raw_input/',
              }
        })

        const graphqlCall = await API.graphql(
            graphqlOperation(
                createTranslationRecordings,
                {input: recordingInput},
                aws_exports.aws_appsync_apiKey
            )
        )
        const startStepFunction = await API.graphql(
            graphqlOperation(
                startTranslationSfn,
                {input: recordingInput},
                        aws_exports.aws_appsync_apiKey
            )
        );
      } catch (err) {
        console.log('error: ', err)
      }
    }
  }
  async function listRecordings() {
    const recordings = await API.graphql(graphqlOperation(listTranslationRecordings));

    console.log(recordings, "recordings");
    // @ts-ignore
    updateRecordings(recordings?.data.listRecordings.items)
  }

  const constraints = {
    audio: true,
    video: false,
    onStop: (blobUrl: string, blob: Blob) => {
      const file = new File([blob],uuid(),{ type:"audio/wav" })

      pushRecordingToCloud(file);
    }
  };

  const {status, startRecording, stopRecording, mediaBlobUrl} = useReactMediaRecorder(
      constraints
  );

  const handleStopAction = () => {
    setCurrMediaBlobUrl(mediaBlobUrl || '');
    stopRecording();
    setIsRecording(false);
  }

  interface FlagObject {
    src: string;
    alt: string;
    name: string;
  }

  const outputLanguage: FlagObject[] = [
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/sv.png",
      alt: "sv",
      name: "Swedish",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/it.png",
      alt: "it",
      name: "Italian",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/ru.png",
      alt: "ru",
      name: "Russian",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/ja.png",
      alt: "ja",
      name: "Japanese",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/fr.png",
      alt: "fr",
      name: "French",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/ca.png",
      alt: "ca",
      name: "Canadian",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/es2.png",
      alt: "es",
      name: "Spanish",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/pl.png",
      alt: "pl",
      name: "Polish",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/de.png",
      alt: "de",
      name: "German",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/en.png",
      alt: "en",
      name: "English",
    },
    {
      src: "https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/gb.png",
      alt: "gb",
      name: "British English",
    }
  ];

  const unselectSource = () => {
    // ...
  };

  const selectLanguage = (mode: string, language: React.SetStateAction<string>) => {
    if (mode === 'source') {
      setSourceLanguage(language);
    } else {
      setTargetLanguage(language);
    }
  };
  const handleClickableImage = (source: string, language: string) => {
    unselectSource();
    selectLanguage(source, language);
  }


  return (
    <AmplifyProvider theme={theme}>
      <Authenticator>
        {({ signOut, user }) => (
          <Flex
            direction="column"
            justifyContent="flex-start"
            alignItems="center"
            alignContent="flex-start"
            wrap="nowrap"
            gap="1rem"
            textAlign="center"
          >
            {user && (
              <View width="100%">
                <Text>Hello {user.username}</Text>
                <Button onClick={signOut}>
                  <Text>Sign Out</Text>
                </Button>
              </View>
            )}

            <View width="100%">
              <div>
                <img src="https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/logo.png"
                     alt={"logo"}
                     height="80"/>
              </div>
              <div className={`languageSelectionWrapper`}>
                Select Source Language
                <div className={`flagRow`}>
                  <div className="flags">
                    <img id="source_en"
                         className='clickableImage'
                         src="https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/en2.png"
                         height="100"
                         onClick={() => handleClickableImage('source', 'en-US')}/>
                    <br/>US <br/>English
                  </div>
                  <div className="flags">
                    <img id="source_es"
                         alt={"es"}
                         className='clickableImage'
                         src="https://s3.amazonaws.com/tomash-us-east-1/voice-translator/graphics/flags/es.png"
                         height="100"
                         onClick={() => handleClickableImage('source', 'es-ES')}/>
                    <br/>US <br/>Spanish
                  </div>

                </div>
              </div>


              <div className={`languageSelectionWrapper`}>
                Select Target Language
                <div className={`flagRow`}>
                  {outputLanguage.map((flag: FlagObject) => (
                      <div className="flags"
                           key={flag.alt}>
                        <img id={`target_${flag.alt}`}
                             className='clickableImage'
                             src={flag.src}
                             height="100"
                             alt={flag.alt}
                             onClick={() => handleClickableImage('target', flag.alt)}/>
                        <br/>{flag.name}<br/>&nbsp;
                      </div>
                  ))}
                </div>
              </div>
              {
                recordings.length >  0 && recordings.map((p, i) => (
                    <video
                        // style={styles.image}
                        key={i}
                        src={p}
                    />
                ))
              }
              <p>{transcription.length > 0 && transcription}</p>
              <p>{translation.length > 0 && translation}</p>
              <p>{status}</p>
              <button onClick={startRecording}>Start Recording</button>
              <button onClick={handleStopAction}>Stop Recording</button>
              <video src={currMediaBlobUrl} controls autoPlay/>
            </View>
          </Flex>
        )}
      </Authenticator>
    </AmplifyProvider>
  );
};

export default App;
