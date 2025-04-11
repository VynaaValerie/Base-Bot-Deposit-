/*
SCRIPT BY © VYNAA VALERIE 
•• recode kasih credits 
•• contacts: (t.me/VynaaValerie)
•• instagram: @vynaa_valerie 
•• (github.com/VynaaValerie) 
*/
const { 
    useMultiFileAuthState, 
    makeWASocket, 
    DisconnectReason,
    makeInMemoryStore,
    jidDecode,
    proto,
    getContentType,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys")
const readline = require("readline")
const Pino = require("pino")
const fs = require("fs")
const path = require("path")
const PhoneNumber = require('awesome-phonenumber')

// Fix untuk crypto
if (typeof globalThis.crypto !== 'object') {
    globalThis.crypto = require('crypto').webcrypto
}
/*
SCRIPT BY © VYNAA VALERIE 
•• recode kasih credits 
•• contacts: (t.me/VynaaValerie)
•• instagram: @vynaa_valerie 
•• (github.com/VynaaValerie) 
*/
// Inisialisasi store
const store = makeInMemoryStore({ logger: Pino().child({ level: 'silent', stream: 'store' }) })

// Database setup
const DB_PATH = path.join(__dirname, 'database.json')

function loadDatabase() {
    if (!fs.existsSync(DB_PATH)) {
        fs.writeFileSync(DB_PATH, JSON.stringify({ users: {} }, null, 2))
        return { users: {} }
    }
    return JSON.parse(fs.readFileSync(DB_PATH))
}

function saveDatabase(db) {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2))
}

function getUser(db, jid, createIfNotExist = true) {
    const id = jid.split('@')[0]
    if (!db.users[id]) {
        if (!createIfNotExist) return null
        db.users[id] = {
            jid,
            name: '',
            number: id,
            saldo: 0,
            registered: false,
            lastActive: new Date().toISOString(),
            createdAt: new Date().toISOString()
        }
    }
    return db.users[id]
}
/*
SCRIPT BY © VYNAA VALERIE 
•• recode kasih credits 
•• contacts: (t.me/VynaaValerie)
•• instagram: @vynaa_valerie 
•• (github.com/VynaaValerie) 
*/
// Fungsi untuk input
const question = (text) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    })
    return new Promise((resolve) => {
        rl.question(text, (answer) => {
            rl.close()
            resolve(answer)
        })
    })
}

// Fungsi utama
async function startBot() {
    try {
        // Load database
        const db = loadDatabase()
        
        const { state, saveCreds } = await useMultiFileAuthState("session")
        const sock = makeWASocket({
            logger: Pino({ level: "silent" }),
            printQRInTerminal: false,
            auth: state,
            browser: ["Ubuntu", "Chrome", "20.0.04"],
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 0,
            keepAliveIntervalMs: 10000,
            emitOwnEvents: true,
            fireInitQueries: true,
            generateHighQualityLinkPreview: true,
            syncFullHistory: true,
            markOnlineOnConnect: true
        })

        // Pairing jika belum terdaftar
        if (!sock.authState.creds.registered) {
            let phoneNumber = await question("Masukkan Nomor Anda (mulai dengan 62): ")
            phoneNumber = phoneNumber.replace(/[^0-9]/g, "")
            
            if (!phoneNumber.startsWith("62")) {
                console.log("⚠️ Nomor harus diawali dengan 62")
                process.exit(1)
            }
            
            try {
                let code = await sock.requestPairingCode(phoneNumber)
                code = code.match(/.{1,4}/g)?.join("-") || code
                console.log(`🔑 Kode Pairing Anda: ${code}`)
            } catch (e) {
                console.log("Gagal meminta kode pairing:", e)
                process.exit(1)
            }
        }

        // Simpan credentials ketika update
        sock.ev.on("creds.update", saveCreds)

        // Handle koneksi
        sock.ev.on("connection.update", (update) => {
            const { connection, lastDisconnect } = update
            if (connection === "open") {
                console.log("✅ Berhasil terhubung ke WhatsApp!")
                console.log("Pengguna:", sock.user?.id || "Unknown")
            } else if (connection === "close") {
                const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
                
                if (reason === DisconnectReason.badSession) {
                    console.log("⚠️ Session rusak, hapus folder session dan scan ulang")
                } else if (reason === DisconnectReason.connectionClosed) {
                    console.log("⚠️ Koneksi ditutup, mencoba reconnect...")
                    setTimeout(startBot, 5000)
                } else if (reason === DisconnectReason.connectionLost) {
                    console.log("⚠️ Koneksi hilang, mencoba reconnect...")
                    setTimeout(startBot, 5000)
                } else if (reason === DisconnectReason.restartRequired) {
                    console.log("⚠️ Restart diperlukan, restarting...")
                    setTimeout(startBot, 5000)
                } else if (reason === DisconnectReason.timedOut) {
                    console.log("⚠️ Koneksi timeout, mencoba reconnect...")
                    setTimeout(startBot, 5000)
                } else {
                    console.log("⚠️ Koneksi terputus karena alasan tidak diketahui:", reason)
                }
            }
        })

        // Binding store
        store.bind(sock.ev)

        // Handle incoming messages
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0]
            if (!m.message) return
            
            try {
                const msg = smsg(sock, m, store)
                
                // Update user in database
                const user = getUser(db, msg.sender)
                user.name = await sock.getName(msg.sender)
                user.lastActive = new Date().toISOString()
                saveDatabase(db)
                
                // Process message
                require("./case")(sock, msg, store, db)
            } catch (e) {
                console.log("Error processing message:", e)
            }
        })

        // Utility functions
        sock.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                const decoded = jidDecode(jid) || {}
                return decoded.user && decoded.server ? `${decoded.user}@${decoded.server}` : jid
            }
            return jid
        }

        sock.getName = async (jid, withoutContact = false) => {
            const id = sock.decodeJid(jid)
            withoutContact = sock.withoutContact || withoutContact
            
            if (id.endsWith("@g.us")) {
                let groupMetadata = await sock.groupMetadata(id).catch(() => null)
                return groupMetadata?.subject || "Unknown Group"
            } else {
                let v = id === '0@s.whatsapp.net' ? {
                    id,
                    name: 'WhatsApp'
                } : id === sock.decodeJid(sock.user.id) ?
                sock.user :
                (store.contacts[id] || {})
                
                return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || 
                       PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
            }
        }

        sock.sendText = (jid, text, quoted = '', options) => {
            return sock.sendMessage(jid, { text: text, ...options }, { quoted })
        }

        sock.downloadMediaMessage = async (message) => {
            const mime = (message.msg || message).mimetype || ''
            const messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
            const stream = await downloadContentFromMessage(message, messageType)
            let buffer = Buffer.from([])
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk])
            }
            
            return buffer
        }

        // Database functions
        sock.getUser = (jid) => {
            return getUser(db, jid)
        }

        sock.updateUser = (jid, data) => {
            const user = getUser(db, jid)
            Object.assign(user, data)
            saveDatabase(db)
            return user
        }

        sock.addBalance = (jid, amount) => {
            const user = getUser(db, jid)
            user.saldo += amount
            saveDatabase(db)
            return user.saldo
        }

        sock.deductBalance = (jid, amount) => {
            const user = getUser(db, jid)
            if (user.saldo < amount) return false
            user.saldo -= amount
            saveDatabase(db)
            return user.saldo
        }

    } catch (error) {
        console.error("❌ Error saat memulai bot:", error)
        setTimeout(startBot, 5000) // Coba ulang setelah 5 detik
    }
}

// Fungsi untuk memproses pesan
function smsg(conn, m, store) {
    if (!m) return m
    const M = proto.WebMessageInfo
    
    if (m.key) {
        m.id = m.key.id
        m.isBaileys = m.id.startsWith('BAE5') && m.id.length === 16
        m.chat = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.chat.endsWith('@g.us')
        m.sender = conn.decodeJid(m.fromMe && conn.user.id || m.participant || m.key.participant || m.chat || '')
        if (m.isGroup) m.participant = conn.decodeJid(m.key.participant) || ''
    }
    
    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype == 'viewOnceMessage' ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype])
        
        m.body = m.message.conversation || m.msg.caption || m.msg.text || 
                (m.mtype == 'listResponseMessage') && m.msg.singleSelectReply.selectedRowId || 
                (m.mtype == 'buttonsResponseMessage') && m.msg.selectedButtonId || 
                (m.mtype == 'viewOnceMessage') && m.msg.caption || ''
        
        // Handle quoted message
        if (m.msg.contextInfo) {
            m.quoted = m.msg.contextInfo.quotedMessage
            m.mentionedJid = m.msg.contextInfo.mentionedJid || []
            
            if (m.quoted) {
                let type = getContentType(m.quoted)
                m.quoted = m.quoted[type]
                
                if (typeof m.quoted === 'string') {
                    m.quoted = { text: m.quoted }
                }
                
                m.quoted.mtype = type
                m.quoted.id = m.msg.contextInfo.stanzaId
                m.quoted.chat = m.msg.contextInfo.remoteJid || m.chat
                m.quoted.isBaileys = m.quoted.id ? m.quoted.id.startsWith('BAE5') && m.quoted.id.length === 16 : false
                m.quoted.sender = conn.decodeJid(m.msg.contextInfo.participant)
                m.quoted.fromMe = m.quoted.sender === conn.decodeJid(conn.user.id)
                m.quoted.text = m.quoted.text || m.quoted.caption || m.quoted.conversation || ''
            }
        }
        
        // Download media
        if (m.msg.url) {
            m.download = () => conn.downloadMediaMessage(m)
        }
        
        // Reply method
        m.reply = (text, chatId = m.chat, options = {}) => {
            return Buffer.isBuffer(text) ? 
                conn.sendMessage(chatId, { image: text, caption: options.caption || '' }, { quoted: m }) : 
                conn.sendMessage(chatId, { text: text }, { quoted: m })
        }
    }
    
    return m
}

// Auto restart ketika file diubah
const file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(`🔁 Memuat ulang ${__filename}`)
    delete require.cache[file]
    require(file)
})

// Mulai bot
startBot()