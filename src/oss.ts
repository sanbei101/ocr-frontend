import axios from 'axios';
// 获取预签名的 URL
export const getSignedUrl = async (file: File) => {
  const response = await axios.get(
    'https://ocr-backend.sanbei101.tech/get-presign',
    {
      params: { objectName: file.name }
    }
  );
  if (!response.data.url) throw new Error('获取上传链接失败');
  return { signedUrl: response.data.url };
};

// 上传文件到OSS
export const uploadFile = async (file: File, signedUrl: string) => {
  const fileBuffer = await file.arrayBuffer();
  const response = await fetch(signedUrl, { method: 'PUT', body: fileBuffer });
  if (!response.ok) throw new Error('上传过程中发生错误');
};
