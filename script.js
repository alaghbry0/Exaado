// TonWeb and TON Connect 2.0 integration
const TonWeb = window.TonWeb;
const tonweb = new TonWeb(new TonWeb.HttpProvider('https://testnet.toncenter.com/api/v2/jsonRPC', {apiKey: config.getblockApiKey}));

const connectWalletBtn = document.getElementById('connectWallet');
const walletAddressDiv = document.getElementById('walletAddress'); // Corrected ID
const plansDiv = document.getElementById('plans');
const paymentStatusDiv = document.getElementById('paymentStatus');
const subscribeBtns = document.querySelectorAll('.subscribe');
const transactionHistoryDiv = document.getElementById('transactionHistory');
const transactionsList = document.getElementById('transactions');

let userAddress = null;

async function connectWallet() {
    //  TON Connect 2.0 integration
    //  This is a simplified example, and you should refer to the official TON Connect 2.0 documentation for a complete implementation.
    //  https://github.com/ton-connect/docs

    if (window.Telegram && window.Telegram.WebApp) {
        const data = await window.Telegram.WebApp.showConnectQrCode();
        console.log("Telegram WebApp Data:", data)
        // In a real application, you would verify this data on the server-side

        const walletAddress = data.split("ton://transfer/")[1];

        walletAddressDiv.textContent = "Wallet Address: " + walletAddress;
        walletAddressDiv.style.display = "block";
        plansDiv.style.display = "block";
        transactionHistoryDiv.style.display = "block";

        userAddress = walletAddress;

        // Fetch and display transaction history
        fetchTransactionHistory(walletAddress);
      } else {
        alert("Please open this app in Telegram.");
      }
}

async function sendTransaction(toAddress, amount) {
    paymentStatusDiv.textContent = "Processing payment...";

    try {
        const wallet = tonweb.wallet.create({ address: userAddress });
        const seqno = await wallet.methods.seqno().call();

        const transfer = wallet.methods.transfer({
            // Remove secretKey from here
            toAddress: toAddress,
            amount: TonWeb.utils.toNano(amount),
            seqno: seqno || 0,
            payload: null, // Optional
            sendMode: 3, // Pay gas from the wallet balance
        });

        // We'll send the transaction details to the server
        const transferData = {
            toAddress: toAddress,
            amount: TonWeb.utils.toNano(amount),
            seqno: seqno || 0,
            payload: null, // Optional
            sendMode: 3, // Pay gas from the wallet balance
        };

        paymentStatusDiv.textContent = "Waiting for server confirmation...";

        // Send transaction details to server
        const tg = window.Telegram.WebApp;
        tg.sendData(JSON.stringify({
            command: "sendTransaction",
            transferData: transferData,
            userId: tg.initDataUnsafe.user.id,
            userAddress: userAddress
        }));

        // const result = await transfer.send(); // Remove this line

        // if (result) {
        //     paymentStatusDiv.textContent = "Payment successful!";
        //     return true;
        // } else {
        //     paymentStatusDiv.textContent = "Payment failed.";
        //     return false;
        // }
    } catch (error) {
        console.error(error);
        paymentStatusDiv.textContent = "Error: " + error.message;
        return false;
    }
}

async function fetchTransactionHistory(address) {
    try {
        const transactions = await tonweb.getTransactions(address);
        transactionsList.innerHTML = "";
        transactions.forEach(tx => {
            const li = document.createElement('li');
            li.textContent = `Amount: ${TonWeb.utils.fromNano(tx.in_msg.value)} ${config.paymentCurrency}, Status: ${tx.success ? 'Success' : 'Failed'}`;
            transactionsList.appendChild(li);
        });
    } catch (error) {
        console.error(error);
        transactionsList.innerHTML = "<li>Error fetching transaction history.</li>";
    }
}

connectWalletBtn.addEventListener('click', connectWallet);

subscribeBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
        const channelId = btn.dataset.channelId;
        // const success = await sendTransaction("YOUR_WALLET_ADDRESS", config.paymentAmount); // Remove this line
        await sendTransaction("UQAWb4x9KVxA51hf0rq5iRSOJRG13g_UeMTEuUELub_iy6cp", config.paymentAmount); // تم التعديل

        // Remove this block as we are handling it in sendTransaction
        // if (success) {
        //     // Send message to Telegram bot to add user to channel
        //     const tg = window.Telegram.WebApp;
        //     tg.sendData(JSON.stringify({
        //         command: "addUserToChannel",
        //         userId: tg.initDataUnsafe.user.id,
        //         channelId: channelId,
        //         userAddress: userAddress
        //     }));
        //     // window.Telegram.WebApp.close();
        // }
    });
});


// Telegram Bot API integration
window.Telegram.WebApp.ready();