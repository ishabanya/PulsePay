import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
export declare class Secrets extends Construct {
    readonly firebaseSecret: secretsmanager.Secret;
    readonly stripeSecret: secretsmanager.Secret;
    constructor(scope: Construct, id: string);
}
