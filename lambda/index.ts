const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event: any) => {
    // GET リクエストなら全件取得
    if (event.httpMethod === 'GET') {
        const result = await dynamo.scan({ TableName: process.env.TABLE_NAME }).promise();
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify(result.Items),
        };
    }

    // POST リクエスト（予約処理）はそのまま
    if (event.httpMethod === 'POST') {
        const body = JSON.parse(event.body);
        await dynamo.put({
            TableName: process.env.TABLE_NAME,
            Item: {
                reservationId: body.reservationId || Date.now().toString(),
                name: body.name,
                date: body.date,
                item: body.item,
                size: body.size || '',
                delivery: body.delivery || '利用しない',
                price: body.price || '¥0',
            },
        }).promise();

        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "予約完了！" }),
        };
    }

    // DELETE リクエストの処理を追記
    if (event.httpMethod === 'DELETE') {
        const body = JSON.parse(event.body);
        const params = {
            TableName: process.env.TABLE_NAME,
            Key: { reservationId: body.reservationId }, // IDで特定
        };
        await dynamo.delete(params).promise();
        return {
            statusCode: 200,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ message: "削除しました！" }),
        };
    }

    return {
        statusCode: 405,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ message: "Method Not Allowed" }),
    };
};