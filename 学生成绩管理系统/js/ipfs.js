/**
 * IPFS和Pinata相关功能
 */

import { pinataApiKey, pinataSecretApiKey } from './config.js';

// 预览选择的图片
function previewImage(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewDiv = document.getElementById('imagePreview');
            previewDiv.innerHTML = `<img src="${e.target.result}" alt="预览图片" style="max-width: 300px; margin: 10px 0;">`;
        }
        reader.readAsDataURL(file);
    }
}

// Upload Image to Pinata Function
async function uploadImageToPinata() {
    const fileInput = document.getElementById('imageInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('请选择一个图片文件');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretApiKey,
            },
            body: formData,
        });

        const result = await response.json();
        if (result.IpfsHash) {
            const imageUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;
            document.getElementById('pinataResponse').innerHTML = `
                <p>图片上传成功！</p>
                <p>IPFS Hash: ${result.IpfsHash}</p>
                <p><a href="${imageUrl}" target="_blank">查看图片</a></p>
                <img src="${imageUrl}" alt="已上传的图片" style="max-width: 300px; margin: 10px 0;">
            `;
        } else {
            document.getElementById('pinataResponse').innerText = '图片上传失败';
        }
    } catch (error) {
        console.error('上传图片到 Pinata 时出错:', error);
        document.getElementById('pinataResponse').innerText = '上传图片时发生错误';
    }
}

export {
    previewImage,
    uploadImageToPinata
};