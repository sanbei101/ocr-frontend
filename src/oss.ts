import axios from 'axios';
// 获取预签名的 URL
export const getSignedUrl = async (fileName: string): Promise<string> => {
  const response = await axios.get(
    'https://ocr-go-backend-ksglcimcak.cn-beijing.fcapp.run/get-presign',
    {
      params: { objectName: fileName }
    }
  );
  if (!response.data.url) throw new Error('获取上传链接失败');
  return response.data.url as string;
};

// 上传文件到OSS
export const uploadFile = async (file: File, signedUrl: string) => {
  const fileBuffer = await file.arrayBuffer();
  const response = await fetch(signedUrl, { method: 'PUT', body: fileBuffer });
  if (!response.ok) throw new Error('上传过程中发生错误');
};
