![Banner](https://files.catbox.moe/9dzaq7.jpg)

# WhatsApp Bot Base

A feature-rich WhatsApp bot built using Baileys library with command handling, user management, and balance system.

![Node.js](https://img.shields.io/badge/Node.js-16.x+-green)
![Baileys](https://img.shields.io/badge/Baileys-6.6.0-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)
![Forks](https://img.shields.io/badge/Forks-980-brightgreen)
![Stars](https://img.shields.io/badge/Stars-890-blueviolet)
![Issues](https://img.shields.io/badge/Issues-400-orange)

## Features

- 📱 WhatsApp Web connection with session management
- 💬 Multi-prefix command system (`!`, `#`, `/`, `.`, `$`, `-`)
- 👤 User database with balance tracking
- 🔒 Owner-only commands for administration
- 📊 Balance management system (add/remove/check)
- 📝 Beautiful message logging format
- 🔄 Auto-reload on file changes
- 📦 Simple JSON database storage

## Installation

1. Clone the repository:
```bash
git clone https://github.com/VynaaValerie/Base-Bot-Deposit-.git
cd whatsapp-bot
```

2. Install dependencies:
```bash
npm install
```

3. Configure your settings in `config.js`:
```javascript
global.owner = [
  "628", // Your WhatsApp number
  "628"  // Additional owner (optional)
]
```

4. Start the bot:
```bash
npm start
```

5. Scan the QR code with your WhatsApp account when prompted.

## Command List

### General Commands
| Command   | Description                | Example           |
|-----------|----------------------------|-------------------|
| `menu`    | Show bot menu              | `!menu`           |
| `owner`   | Show owner information     | `#owner`          |
| `source`  | Show source code           | `/source`         |
| `info`    | Show bot information       | `.info`           |
| `help`    | Show help                  | `$help`           |

### Owner Commands
| Command     | Description                      | Example               |
|-------------|----------------------------------|-----------------------|
| `addsaldo`  | Add balance to user              | `!addsaldo 628xx 500` |
| `delsaldo`  | Deduct balance from user         | `#delsaldo 628xx 200` |
| `ceksaldo`  | Check user balance               | `/ceksaldo 628xx`     |

## Database Structure

User data is stored in `database.json`:
```json
{
  "users": {
    "6281234567890": {
      "jid": "6281234567890@s.whatsapp.net",
      "name": "User Name",
      "number": "6281234567890",
      "saldo": 1000,
      "registered": true,
      "lastActive": "2023-01-01T00:00:00.000Z",
      "createdAt": "2023-01-01T00:00:00.000Z"
    }
  }
}
```

## File Structure

```
whatsapp-bot/
├── index.js       # Main bot file
├── case.js        # Command handler
├── config.js      # Configuration
├── package.json   # Dependencies
└── database.json  # User database (auto-generated)
```

## Dependencies

- [@whiskeysockets/baileys](https://github.com/whiskeysockets/Baileys) - WhatsApp Web library
- [pino](https://github.com/pinojs/pino) - Logging
- [awesome-phonenumber](https://github.com/grantila/awesome-phonenumber) - Phone number formatting
- [axios](https://github.com/axios/axios) - HTTP requests

## Troubleshooting

1. **Pairing Code**:
   - Delete the `session` folder and restart the bot
   - Ensure your phone has an active internet connection

2. **Connection Issues**:
   - Check your internet connection
   - The bot will automatically attempt to reconnect

3. **Command Not Working**:
   - Ensure you're using one of the supported prefixes
   - Check for typos in the command

## Credits

Developed by [Vynaa Valerie](https://github.com/VynaaValerie)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
