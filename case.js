require("./config");
const fs = require('fs');
const util = require('util');
const axios = require('axios');

// Simple color implementation as fallback
const colors = {
    reset: str => `\x1b[0m${str}\x1b[0m`,
    bold: str => `\x1b[1m${str}\x1b[0m`,
    dim: str => `\x1b[2m${str}\x1b[0m`,
    red: str => `\x1b[31m${str}\x1b[0m`,
    green: str => `\x1b[32m${str}\x1b[0m`,
    yellow: str => `\x1b[33m${str}\x1b[0m`,
    blue: str => `\x1b[34m${str}\x1b[0m`,
    cyan: str => `\x1b[36m${str}\x1b[0m`,
    gray: str => `\x1b[90m${str}\x1b[0m`,
    white: str => `\x1b[37m${str}\x1b[0m`
};

// Multi-prefix support
const prefixes = ['!', '#', '/', '.', '$', '-'];

// Format date as DD/MM/YYYY HH:MM:SS
function formatDate(date) {
    const pad = num => num.toString().padStart(2, '0');
    return [
        [pad(date.getDate()), pad(date.getMonth() + 1), date.getFullYear()].join('/'),
        [pad(date.getHours()), pad(date.getMinutes()), pad(date.getSeconds())].join(':')
    ].join(' ');
}

// Format user info (sender)
function formatUser(sender) {
    const name = sender?.pushName || 'Unknown User';
    const jid = sender?.remoteJid || 'unknown';
    return `${colors.green(name)} ${colors.dim(`(${jid})`)}`;
}

// Main logger for Baileys messages
function printWAInfo(msg, sender, chat, body) {
    const date = new Date();

    // Header
    console.log(colors.gray('┌' + '─'.repeat(60) + '┐'));
    console.log(colors.bold(colors.white('  WHATSAPP MESSAGE LOGGER')));
    console.log(colors.gray('├' + '─'.repeat(60) + '┤'));

    // Message metadata
    console.log(colors.bold(colors.white('  MESSAGE INFO')));
    console.log(colors.gray('  ├─') + ` ID: ${colors.yellow(msg.key.id)}`);
    console.log(colors.gray('  ├─') + ` Date: ${colors.yellow(formatDate(date))}`);
    console.log(colors.gray('  └─') + ` From: ${formatUser(sender)}`);

    // Chat info
    console.log(colors.bold(colors.white('  CHAT INFO')));
    console.log(colors.gray('  └─') + ` Chat ID: ${colors.cyan(chat)}`);

    // Content
    console.log(colors.bold(colors.white('  CONTENT')));
    const content = body || colors.dim('(no text content)');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        const prefix = i === 0 ? colors.gray('  └─') : colors.gray('     ');
        console.log(prefix + ' ' + colors.white(line));
    });

    // Footer
    console.log(colors.gray('└' + '─'.repeat(60) + '┘'));
    console.log();
}

// User database simulation
class UserDatabase {
    constructor() {
        this.users = new Map();
    }

    getUser(jid) {
        if (!this.users.has(jid)) {
            this.users.set(jid, {
                jid,
                name: '',
                number: jid.split('@')[0],
                saldo: 0,
                registered: false,
                lastActive: new Date(),
                createdAt: new Date()
            });
        }
        return this.users.get(jid);
    }

    updateUser(jid, data) {
        const user = this.getUser(jid);
        this.users.set(jid, { ...user, ...data, lastActive: new Date() });
    }

    addBalance(jid, amount) {
        const user = this.getUser(jid);
        user.saldo += amount;
        this.updateUser(jid, { saldo: user.saldo });
    }

    deductBalance(jid, amount) {
        const user = this.getUser(jid);
        user.saldo -= amount;
        this.updateUser(jid, { saldo: user.saldo });
    }
}

// Initialize user database
const userDB = new UserDatabase();

// Check if user is owner
function isOwner(jid) {
    const number = jid.split('@')[0];
    return global.owner.includes(number);
}

module.exports = async (ptz, m) => {
    try {
        const body = (
            (m.mtype === 'conversation' && m.message.conversation) ||
            (m.mtype === 'imageMessage' && m.message.imageMessage.caption) ||
            (m.mtype === 'documentMessage' && m.message.documentMessage.caption) ||
            (m.mtype === 'videoMessage' && m.message.videoMessage.caption) ||
            (m.mtype === 'extendedTextMessage' && m.message.extendedTextMessage.text) ||
            (m.mtype === 'buttonsResponseMessage' && m.message.buttonsResponseMessage.selectedButtonId) ||
            (m.mtype === 'templateButtonReplyMessage' && m.message.templateButtonReplyMessage.selectedId)
        ) || '';

        // Ensure sender object exists
        const sender = {
            pushName: m.pushName || 'Unknown User',
            remoteJid: m.key.remoteJid || 'unknown'
        };

        // Log incoming message
        printWAInfo(m, sender, m.key.remoteJid, body);

        if (!body) return;
        
        // Check if message starts with any prefix
        const usedPrefix = prefixes.find(p => body.startsWith(p));
        if (!usedPrefix) return;

        const command = body.slice(usedPrefix.length).trim().split(/ +/).shift().toLowerCase();
        const args = body.slice(usedPrefix.length + command.length).trim().split(/ +/);

        // Get user from database
        const user = userDB.getUser(m.key.remoteJid);
        
        // Update user name if not set
        if (!user.name) {
            user.name = m.pushName || 'Unknown User';
            userDB.updateUser(m.key.remoteJid, { name: user.name });
        }

        // Log command execution
        console.log(colors.blue(`[COMMAND] ${command} executed by ${user.name} in ${m.key.remoteJid}`));
        console.log(colors.gray(`Arguments: ${args.join(' ')}`));

        switch (command) {
            case "menu":
                const menuText = `
🤖 *BOT MENU* 🤖

🔹 *!help* - Show this menu
🔹 *!owner* - Show owner info
🔹 *!source* - Show source code
🔹 *!info* - Bot information

📌 *Note*: Use prefix ${prefixes.join(' or ')} before command
                `;
                await ptz.sendText(m.key.remoteJid, menuText.trim());
                break;

            case "owner":
                await ptz.sendText(m.key.remoteJid, "*Vynaa Valerie* adalah owner dan developer saya. Ini Instagram-nya: https://instagram.com/vynaa_valerie");
                break;

            case "source":
            case "sc":
                await ptz.sendText(m.key.remoteJid, "Source code saya ada di GitHub: https://github.com/VynaaValerie");
                break;

            case "info":
                await ptz.sendText(m.key.remoteJid, "Hai! Saya adalah bot WhatsApp yang dikembangkan oleh *Vynaa Valerie*. Saya memiliki berbagai fitur menarik yang bisa Anda gunakan. Ketik !menu untuk melihat daftar perintah.");
                break;

            case "help":
                await ptz.sendText(m.key.remoteJid, "Untuk melihat menu, ketik !menu");
                break;

            case "addsaldo":
                if (!isOwner(m.key.remoteJid)) {
                    await ptz.sendText(m.key.remoteJid, "Maaf, perintah ini hanya untuk owner!");
                    return;
                }
                
                if (args.length < 2) {
                    await ptz.sendText(m.key.remoteJid, "Format salah! Contoh: .addsaldo 628123456789 5000");
                    return;
                }
                
                const [targetNumber, addAmount] = args;
                const amountToAdd = parseInt(addAmount);
                
                if (isNaN(amountToAdd) || amountToAdd <= 0) {
                    await ptz.sendText(m.key.remoteJid, "Jumlah harus angka positif!");
                    return;
                }
                
                const targetJid = `${targetNumber}@s.whatsapp.net`;
                const targetUser = userDB.getUser(targetJid);
                userDB.addBalance(targetJid, amountToAdd);
                
                await ptz.sendText(m.key.remoteJid, `✅ Berhasil menambahkan ${amountToAdd} saldo ke ${targetUser.name || targetNumber}\nSaldo baru: ${targetUser.saldo + amountToAdd}`);
                break;
                
            case "delsaldo":
                if (!isOwner(m.key.remoteJid)) {
                    await ptz.sendText(m.key.remoteJid, "Maaf, perintah ini hanya untuk owner!");
                    return;
                }
                
                if (args.length < 2) {
                    await ptz.sendText(m.key.remoteJid, "Format salah! Contoh: .delsaldo 628123456789 5000");
                    return;
                }
                
                const [delTargetNumber, delAmount] = args;
                const amountToDel = parseInt(delAmount);
                
                if (isNaN(amountToDel) || amountToDel <= 0) {
                    await ptz.sendText(m.key.remoteJid, "Jumlah harus angka positif!");
                    return;
                }
                
                const delTargetJid = `${delTargetNumber}@s.whatsapp.net`;
                const delTargetUser = userDB.getUser(delTargetJid);
                
                if (delTargetUser.saldo < amountToDel) {
                    await ptz.sendText(m.key.remoteJid, "Saldo tidak mencukupi untuk dikurangi!");
                    return;
                }
                
                userDB.deductBalance(delTargetJid, amountToDel);
                await ptz.sendText(m.key.remoteJid, `✅ Berhasil mengurangi ${amountToDel} saldo dari ${delTargetUser.name || delTargetNumber}\nSaldo baru: ${delTargetUser.saldo - amountToDel}`);
                break;
                
            case "ceksaldo":
                if (!isOwner(m.key.remoteJid)) {
                    await ptz.sendText(m.key.remoteJid, "Maaf, perintah ini hanya untuk owner!");
                    return;
                }
                
                if (args.length < 1) {
                    await ptz.sendText(m.key.remoteJid, "Format salah! Contoh: .ceksaldo 628123456789");
                    return;
                }
                
                const checkNumber = args[0];
                const checkJid = `${checkNumber}@s.whatsapp.net`;
                const checkUser = userDB.getUser(checkJid);
                
                await ptz.sendText(m.key.remoteJid, `💰 Saldo ${checkUser.name || checkNumber}: ${checkUser.saldo}`);
                break;

            default:
                // Unknown command
                await ptz.sendText(m.key.remoteJid, `Perintah tidak dikenali. Ketik ${usedPrefix}menu untuk melihat daftar perintah.`);
                console.log(colors.yellow(`[WARNING] Unknown command: ${command}`));
                break;
        }

    } catch (err) {
        console.log('[ERROR]', util.format(err));
    }
}

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('[UPDATE] File updated:', __filename);
    delete require.cache[file];
    require(file);
});