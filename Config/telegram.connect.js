const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const input = require('input');
const dotenv = require('dotenv');

dotenv.config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phone = process.env.PHONE;
const savedSession = process.env.TG_SESSION || '';  

const stringSession = new StringSession(savedSession);
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

let isConnected = false;

/**
 * Login manually (one-time) to generate session string
 */
const login = async () => {
  console.log("Connecting to Telegram...");
  await client.start({
    phoneNumber: async () => phone,
    phoneCode: async () => await input.text('Enter the OTP you received: '),
    onError: (err) => console.error("Login error:", err),
  });

  console.log("✅ Logged in!");
  console.log("💾 Save this session string in your .env as TG_SESSION=");
  console.log(client.session.save());
};

/**
 * Ensure Telegram client is connected (for re-use in APIs)
 */
const ensureConnected = async () => {
  if (!isConnected) {
    await client.connect();
    isConnected = true;
    console.log("✅ Telegram client connected (re-used session)");
  }
};

/**
 * Send message to a Telegram user by phone number
 */
const sendMessageToPhone = async (phoneNumber, message, res) => {
  try {
    await ensureConnected();

    const result = await client.invoke(
      new Api.contacts.ImportContacts({
        contacts: [
          new Api.InputPhoneContact({
            clientId: BigInt(Date.now()),
            phone: phoneNumber,
            firstName: "User",
            lastName: "Telegram",
          }),
        ],
      })
    );

    const user = result.users[0];
    if (!user) {
      return res.status(404).json({ message: "User not found on Telegram" });
    }

    await client.sendMessage(user, { message });
    res.status(200).json({ message: `Message sent to ${phoneNumber}` });
  } catch (error) {
    console.error("Error sending Telegram message:", error);
    res.status(500).json({ message: "Error sending message: " + error.message });
  }
};

module.exports = {
  login,             
  sendMessageToPhone 
};
