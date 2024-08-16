import { jest } from "@jest/globals";
import { APIGatewayProxyEventQueryStringParameters, APIGatewayProxyEventV2 } from "aws-lambda";

export const exampleContext = {
        callbackWaitsForEmptyEventLoop: false,
        functionName: "",
        functionVersion: "",
        invokedFunctionArn: "",
        memoryLimitInMB: "",
        awsRequestId: "",
        logGroupName: "",
        logStreamName: "",
        getRemainingTimeInMillis: () => 0,
        done: () => {},
        fail: () => {},
        succeed: () => {}
};

export const exampleCallback = () => {};

type HttpMethod = "GET" | "POST" | "DELETE" | "PUT";
type HttpHeaders = {
    [key: string]: string;
}

export function createEvent(headers: HttpHeaders, path: string, method: HttpMethod, 
    body?: any, query?: APIGatewayProxyEventQueryStringParameters) {
    const event: APIGatewayProxyEventV2 = {
        version: "",
        routeKey: "",
        rawPath: "",
        rawQueryString: "",
        headers: headers,
        requestContext: {
            accountId: "",
            apiId: "",
            domainName: "",
            domainPrefix: "",
            http: {
                method: method,
                path: path,
                protocol: "",
                sourceIp: "",
                userAgent: ""
            },
            requestId: "",
            routeKey: "",
            stage: "",
            time: "",
            timeEpoch: 0
        },
        isBase64Encoded: false
    };
    if(body) event.body = JSON.stringify(body);
    if(query) event.queryStringParameters = query;
    
    return event;
}