const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const input = require('input');
const dotenv = require('dotenv');

dotenv.config();

const apiId = parseInt(process.env.API_ID);
const apiHash = process.env.API_HASH;
const phone = process.env.PHONE;

const stringSession = new StringSession(process.env.TELEGRAM_SESSION);
const client = new TelegramClient(stringSession, apiId, apiHash, {
  connectionRetries: 5,
});

const login = async () => {
  console.log("Connecting to Telegram...");
  await client.start({
    phoneNumber: async () => phone,
    phoneCode: async () => await input.text('OTP Code:'),
    onError: (err) => console.log(err),
  });

  console.log('Connected to Telegram!');
  console.log('Your session string:', client.session.save()); 
};

module.exports = { login };


  async function sendMessageToPhone(phoneNumber, message, res) {
    try {
      const result = await client.invoke(
        new Api.contacts.ImportContacts({
          contacts: [
            new Api.InputPhoneContact({
              clientId: BigInt(Date.now()),
              phone: phoneNumber,
              firstName: "Client",
              lastName: "Number",
            }),
          ],
        })
      );
  
      const user = result.users[0];
      if (!user) {
        return res.status(400).json({ message: "User not found on Telegram" });
      }
  
      await client.sendMessage(user, { message });
      res.status(200).json({ message: `Message sent to ${phoneNumber}` });
    } catch (error) {
      res.status(500).json({ message: "Error sending message: " + error });
    }
  }

module.exports = {login , sendMessageToPhone}