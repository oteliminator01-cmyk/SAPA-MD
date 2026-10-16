const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");
const readline = require("readline");

const rl = readline.createInterface({
input: process.stdin,
output: process.stdout
});

function ask(question) {
return new Promise(resolve => rl.question(question, resolve));
}

async function startSapaMD() {
const { state, saveCreds } =
await useMultiFileAuthState("./session");

const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["SAPA-MD", "Chrome", "1.0.0"]
});

sock.ev.on("creds.update", saveCreds);

if (!state.creds.registered) {
    const phoneNumber = (await ask(
        "Enter your WhatsApp number with country code (e.g. 2348012345678): "
    )).replace(/\D/g, "");

    const code = await sock.requestPairingCode(phoneNumber);
    console.log("SAPA-MD PAIRING CODE:", code);
}

sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
        console.log("SAPA-MD connected successfully!");
        rl.close();
    }

    if (connection === "close") {
        const statusCode =
            lastDisconnect?.error?.output?.statusCode;

        console.log("Connection closed:", statusCode);

        if (statusCode !== DisconnectReason.loggedOut) {
            console.log("Restart the process to reconnect.");
        }
    }
});

sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        "";

    if (text.toLowerCase() === ".ping") {
        await sock.sendMessage(jid, {
            text: "🏓 SAPA-MD is online!"
        });
    }

    if (text.toLowerCase() === ".alive") {
        await sock.sendMessage(jid, {
            text: "🤖 SAPA-MD is alive and running!"
        });
    }

    if (text.toLowerCase() === ".menu") {
        await sock.sendMessage(jid, {
            text:
                "╭━━〔 SAPA-MD 〕━━╮\n" +
                "┃ .ping\n" +
                "┃ .alive\n" +
                "┃ .menu\n" +
                "╰━━━━━━━━━━━━━━╯"
        });
    }
});

}

startSapaMD().catch(console.error);
