const axios = require("axios");
const Koa = require('koa');
const router = require('koa-router')();
const cors = require('@koa/cors');
const koaBody = require('koa-body');
const app = new Koa();

const handle_axios_error = function (err) {

    if (err.response) {
        const custom_error = new Error(err.response.statusText || 'Internal server error');
        custom_error.status = err.response.status || 500;
        custom_error.description = err.response.data ? err.response.data.message : null;
        throw custom_error;
    }
    throw new Error(err);

}

axios.interceptors.response.use(r => r, handle_axios_error);

router.post('/send', koaBody(),
    async (ctx) => {
        // console.log(process.env['API_KEY']);
        // console.log(ctx.request.headers['x-api-key']);
        if (ctx.request.headers['x-api-key'] !== process.env['API_KEY']) {
            ctx.status = 403;
            ctx.body = {
                message: "Incorrect API Key"
            }
            // return ctx;
        } else if (ctx.request.body && ctx.request.body.numbers && ctx.request.body.text) {
            let req = ctx.request.body;
            try {
                const response = await sendSMS(req);
                ctx.status = 200;
                ctx.body = {
                    message: response
                };
            } catch (err) {
                ctx.status = 503;
                ctx.body = {
                    message: err
                };
                console.error(err, 'Could not send sms');
            }
        } else {
            ctx.status = 400;
            ctx.body = {
                message: "Incomplete request. Must include numbers and text."
            }
        }
    }
);

async function sendSMS(req) {
    const url = 'https://api.msg91.com/api/v2/sendsms';
    const text = req.text;
    const numbers = req.numbers;
    const payload = JSON.stringify({
        sender: 'SOCKET',
        route: 4,
        country: 91,
        sms: [{
            message: text,
            to: numbers
        }]
    });
    const headers = {
        'authkey': '260958AOISqsrOX5c547129',
        'content-type': 'application/json'
    };
    const options = {
        method: 'POST',
        headers: headers,
        data: payload,
        url: url,
    };
    // return axios(options);
    return new Promise((resolve, reject) => {
        axios(options)
            .then(res => {
                // console.log(Object.keys(res));
                // console.log('Success');
                resolve(res.data.message);
            })
            .catch(err => {
                // console.log('Error', err.description);
                reject(err.description);
            });
    });
}

app.use(cors({
    origin: '*',
    allowMethods: 'POST'
}));
app.use(router.routes());

const server = app.listen(process.env.PORT || 8080, () => {
    console.log("SMS relay server is running at localhost on port", process.env.PORT || 8080);
});