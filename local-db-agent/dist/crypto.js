import { constants, createDecipheriv, generateKeyPairSync, privateDecrypt, } from 'node:crypto';
/**
 * 传输加密：agent 启动时生成一次性 RSA 密钥对（仅内存，不落盘）。
 * 前端用 /handshake 下发的公钥加密 config（AES-256-CBC 加密数据 + RSA 加密 AES 密钥），
 * agent 用私钥解开。目的是让抓包 / DevTools 看不到 config 明文（含 DB 密码、API Key）。
 */
const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
export const handshake = {
    v: 1,
    alg: 'RSA-2048/PKCS1v1.5+AES-256-CBC',
    publicKey,
};
function isConfigEncPayload(value) {
    if (!value || typeof value !== 'object')
        return false;
    const p = value;
    return typeof p.key === 'string' && typeof p.iv === 'string' && typeof p.data === 'string';
}
/** 解密前端下发的 configEnc，返回配置对象。失败抛错（消息面向用户）。 */
export function decryptConfigPayload(payload) {
    if (!isConfigEncPayload(payload)) {
        throw new Error('加密配置格式不正确（configEnc 需包含 key/iv/data）');
    }
    let aesKey;
    try {
        const aesKeyB64 = privateDecrypt({ key: privateKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(payload.key, 'base64')).toString('utf8');
        aesKey = Buffer.from(aesKeyB64, 'base64');
    }
    catch {
        throw new Error('配置解密失败（RSA）。可能是本地服务已重启，请重试。');
    }
    if (aesKey.length !== 32)
        throw new Error('配置解密失败（AES 密钥长度不正确）');
    const iv = Buffer.from(payload.iv, 'base64');
    if (iv.length !== 16)
        throw new Error('配置解密失败（IV 长度不正确）');
    try {
        const decipher = createDecipheriv('aes-256-cbc', aesKey, iv);
        const json = Buffer.concat([
            decipher.update(Buffer.from(payload.data, 'base64')),
            decipher.final(),
        ]).toString('utf8');
        return JSON.parse(json);
    }
    catch {
        throw new Error('配置解密失败（数据校验不通过）。可能是本地服务已重启，请重试。');
    }
}
