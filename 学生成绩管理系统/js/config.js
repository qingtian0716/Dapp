/**
 * 配置信息和常量
 */

// Pinata API credentials
const pinataApiKey = '4474fad72af52b1a7bcf'; // Replace with your Pinata API key
const pinataSecretApiKey = 'baf5c086b522e409e08d13bae1dd933f5adfdfbeb86efc0af5adaf9dbfffa566'; // Replace with your Pinata Secret API key

// 添加时间戳以防止缓存
function addTimestamp(url) {
    return url + '?t=' + new Date().getTime();
}

// 添加BigInt序列化支持
const BigIntSerializer = {
    stringify: (obj) => {
        return JSON.stringify(obj, (key, value) =>
            typeof value === 'bigint'
                ? value.toString()
                : value
        );
    }
};

export {
    pinataApiKey,
    pinataSecretApiKey,
    addTimestamp,
    BigIntSerializer
};