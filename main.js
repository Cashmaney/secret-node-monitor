const fetch = require('node-fetch');
const { exec } = require("child_process");


const serverURL = "http://localhost:1337/blocks/latest"
const masterURL = process.env["MASTER_URL"]

const THRESHOLD = 10;

const getBlockFromResponse = (response) => {
    try{
        return response.block.header.height;
    } catch (e) {
        return undefined;
    }
}

const checkStatusOfServer = async () => {
    const result = await fetch(serverURL);
    const masterResult = await fetch(masterURL);

    const myHeight = getBlockFromResponse(await result.json());
    console.log(`my height: ${myHeight}`)
    const masterHeight = getBlockFromResponse(await masterResult.json());
    console.log(`master height: ${masterHeight}`)

    return !isNaN(myHeight) && !isNaN(masterHeight) && (Number(masterResult) - Number(myHeight) >= THRESHOLD);

}

const stopNginx = async () => {
    await exec('systemctl stop nginx')
}

const startNginx = async () => {
    await exec('systemctl start nginx')
}

const restartLcd = async () => {
    await exec('systemctl restart secret-lcd.service')
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const main = async() => {
    let isStopped = false;
    while (true) {
        try {
            const status = await checkStatusOfServer();
            console.log(`Server status: ${status}`)
            if (!status && !isStopped) {
                isStopped = true;
                await stopNginx();
                console.log(`Stopped Nginx`);
                await restartLcd();
                console.log(`Restarted the lcd`)
            }

            if (isStopped && status) {
                await startNginx();
                console.log(`Started Nginx`)
            }
        } finally {
            await sleep(30000);
        }
    }

}

main().then(
    console.log('Starting...')
).catch(
    console.log('BYE')
)
