const TelegramBot = require('node-telegram-bot-api');
const TonWeb = require("tonweb");
const tonMnemonic = require("tonweb-mnemonic");
const config = require('./config.js');

// تم التعديل
const mnemonic = "strike sail bunker recall fantasy famous hat brick segment menu flavor during vintage priority chuckle silk exclude survey grief input exercise speed benefit liberty";

async function getPrivateKeyFromMnemonic(mnemonic) {
    const seed = await tonMnemonic.mnemonicToSeed(mnemonic.split(" "));
    const keyPair = TonWeb.utils.nacl.sign.keyPair.fromSeed(seed);
    return keyPair.secretKey;
}

const bot = new TelegramBot(config.telegramBotToken, { polling: true });

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const messageText = msg.text;

    if (messageText && messageText.startsWith('{')) {
        try {
            const data = JSON.parse(messageText);

            if (data.command === "addUserToChannel") {
                console.log("Received Data from WebApp:", data);

                bot.getChatMember(data.channelId, data.userId)
                    .then(chatMember => {
                        console.log("Chat Member:", chatMember);
                        if (chatMember.status === 'left' || chatMember.status === 'kicked') {
                            bot.unbanChatMember(data.channelId, data.userId)
                                .then(() => {
                                    console.log(`User ${data.userId} added to channel ${data.channelId}`);
                                    bot.sendMessage(chatId, `User ${data.userId} added to channel ${data.channelId}`);
                                })
                                .catch(error => {
                                    console.error("Error unbanning chat member:", error);
                                    bot.sendMessage(chatId, "Error adding user to channel.");
                                });
                        } else {
                            console.log(`User ${data.userId} is already a member of channel ${data.channelId}`);
                            bot.sendMessage(chatId, `User ${data.userId} is already a member of channel ${data.channelId}`);
                        }
                    })
                    .catch(error => {
                        console.error("Error getting chat member:", error);
                        bot.sendMessage(chatId, "Error adding user to channel.");
                    });
            } else if (data.command === "sendTransaction") {
                console.log("Received Transaction Request from WebApp:", data);

                const privateKey = await getPrivateKeyFromMnemonic(mnemonic);

                const tonweb = new TonWeb(new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC', {apiKey: config.getblockApiKey}));

                const wallet = tonweb.wallet.create({ publicKey: TonWeb.utils.keyPairFromSecretKey(privateKey).publicKey });

                const transfer = wallet.methods.transfer({
                    secretKey: privateKey,
                    toAddress: data.transferData.toAddress,
                    amount: data.transferData.amount,
                    seqno: data.transferData.seqno,
                    payload: data.transferData.payload,
                    sendMode: data.transferData.sendMode,
                });

                const result = await transfer.send();
                if (result) {
                    paymentStatusDiv.textContent = "Payment successful!";
                    bot.sendMessage(chatId, "Payment successful!");
                    // Send message to Telegram bot to add user to channel
                    const tg = window.Telegram.WebApp;
                    tg.sendData(JSON.stringify({
                        command: "addUserToChannel",
                        userId: data.userId,
                        channelId: data.channelId, // Make sure this is passed from the client
                        userAddress: data.userAddress
                    }));
                } else {
                    paymentStatusDiv.textContent = "Payment failed.";
                    bot.sendMessage(chatId, "Payment failed.");
                }
            }
        } catch (error) {
            console.error("Error parsing JSON:", error);
        }
    }
});