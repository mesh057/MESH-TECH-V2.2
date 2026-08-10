const axios = require('axios');
const FormData = require('form-data');
const FileType = require('file-type');

async function uploadToUrl(buffer) {
    try {
        const type = FileType(buffer);
        const ext = type ? type.ext : 'bin';
        const form = new FormData();
        form.append('files[]', buffer, { filename: `file.${ext}`, contentType: type ? type.mime : 'application/octet-stream' });
        
        const res = await axios.post('https://uguu.se/upload.php', form, {
            headers: form.getHeaders(),
            timeout: 20000
        });
        
        if (res.data && res.data.files && res.data.files[0]) {
            return res.data.files[0].url;
        }
        throw new Error('Upload failed: No URL returned');
    } catch (e) {
        console.error('Upload error:', e.message);
        throw e;
    }
}

module.exports = { uploadToUrl };
