import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Network } from './constructs/network';
import { Frontend } from './constructs/frontend';
import { Backend } from './constructs/backend';
import { Secrets } from './constructs/secrets';
export interface PaymentStackProps extends cdk.StackProps {
    environment: 'development' | 'staging' | 'production';
}
export declare class PaymentStack extends cdk.Stack {
    readonly network: Network;
    readonly frontend: Frontend;
    readonly backend: Backend;
    readonly secrets: Secrets;
    constructor(scope: Construct, id: string, props: PaymentStackProps);
}
