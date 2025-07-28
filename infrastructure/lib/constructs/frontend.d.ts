import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';
export interface FrontendProps {
    domainName?: string;
    certificateArn?: string;
}
export declare class Frontend extends Construct {
    readonly bucket: s3.Bucket;
    readonly distribution: cloudfront.Distribution;
    readonly domainName: string;
    constructor(scope: Construct, id: string, props?: FrontendProps);
    addSourceDeployment(sourceAssets: string): void;
}
