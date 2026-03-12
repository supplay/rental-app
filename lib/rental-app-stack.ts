import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda'; // ここを lambda に戻す
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as path from 'path';

export class RentalAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'ReservationsTable', {
      partitionKey: { name: 'reservationId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const reservationHandler = new lambda.Function(this, 'ReservationHandler', {
      runtime: lambda.Runtime.NODEJS_16_X, // 16なら古いSDKが標準で入っています
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    table.grantReadWriteData(reservationHandler);

    new apigw.LambdaRestApi(this, 'ReservationApi', {
      handler: reservationHandler,
    });
  }
}