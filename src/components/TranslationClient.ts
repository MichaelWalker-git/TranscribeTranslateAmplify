import {TranslateClient, TranslateTextCommand} from "@aws-sdk/client-translate";
import {ComprehendClient, DetectDominantLanguageCommand} from "@aws-sdk/client-comprehend";
import {ICredentials} from "@aws-amplify/core";

const DEFAULT_REGION = "us-east-1";

export const translateTextToLanguage = async (text: string,
                                              targetLanguage: string,
                                              userCredentials: ICredentials): Promise<string> => {
    console.log("inside - translateTextToLanguage", text, targetLanguage);
    const sourceLanguage: string = await detectLanguageOfText(text, userCredentials);
    console.log(sourceLanguage, "sourceLanguage");
    return await translateTextFromLanguageToLanguage(text, sourceLanguage, targetLanguage, userCredentials);
};

const detectLanguageOfText = async (text: string, userCredentials: ICredentials): Promise<string> => {
    const comprehendClient = createComprehendClient(userCredentials);
    const data = await comprehendClient.send(
        new DetectDominantLanguageCommand({Text: text})
    );
    console.log(data, "data from comprehend client")
    return data?.Languages?.length && data.Languages[0]?.LanguageCode ? data.Languages[0]?.LanguageCode : "en-us";
}

const createComprehendClient = (userCredentials: ICredentials) => {
    return new ComprehendClient({
        region: DEFAULT_REGION,
        credentials: userCredentials
    });
}

const translateTextFromLanguageToLanguage = async (text: string,
                                                   sourceLanguage: string,
                                                   targetLanguage: string,
                                                   userCredentials: ICredentials): Promise<string> => {
    const translateClient = new TranslateClient({
        region: DEFAULT_REGION,
        credentials: userCredentials
    });
    const translateParams = {
        Text: text,
        SourceLanguageCode: sourceLanguage,
        TargetLanguageCode: targetLanguage,
    };
    console.log(translateParams, "translateParams");

    const data = await translateClient.send(
        new TranslateTextCommand(translateParams)
    );
    return data?.TranslatedText || "";

}
