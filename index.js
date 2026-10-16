const {
default: makeWASocket,
useMultiFileAuthState,
DisconnectReason
} = require("@whiskeysockets/baileys");

const pino = require("pino");

async function startSapaMD() {
const { state, saveCreds } = await useMultiFileAuthState("./session");

const sock = makeWASocket({
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["SAPA-MD", "Chrome", "1.0.0"]
});

sock.ev.on("creds.update", saveCreds);

sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "open") {
        console.log("SAPA-MD connected successfully!");
    }

    if (connection === "close") {
        const statusCode =
            lastDisconnect?.error?.output?.statusCode;

        if (statusCode !== DisconnectReason.loggedOut) {
            console.log("Connection closed. Reconnecting...");
            startSapaMD();
        } else {
            console.log("Logged out. Please pair again.");
        }
    }
});

sock.ev.on("messages.upsert", async ({ messages }) => {
    const msg = messages[0];

    if (!msg.message || msg.key.fromMe) return;

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