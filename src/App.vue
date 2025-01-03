<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 class="text-3xl font-bold text-center text-gray-900 mb-6">Upload Image</h1>
      <div class="flex flex-col items-center space-y-4">
        <!-- 文件选择 -->
        <input
          type="file"
          @change="handleFileChange"
          class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          accept="image/*" />

        <!-- 图片预览 -->
        <img
          v-if="imageUrl"
          :src="imageUrl"
          alt="Preview"
          class="mt-4 rounded-lg"
          width="300"
          height="200" />

        <!-- 上传按钮 -->
        <button
          @click="handleSubmit"
          :disabled="isUploading"
          class="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed">
          <div v-if="isUploading" class="flex items-center justify-center">
            <div
              class="w-5 h-5 border-2 border-white border-t-2 border-t-transparent rounded-full animate-spin"></div>
            <span class="ml-2">Uploading...</span>
          </div>
          <span v-else>上传</span>
        </button>

        <!-- 上传结果 -->
        <div
          v-if="uploadResult"
          :class="`mt-4 p-4 rounded-md ${
            uploadResult.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`">
          {{ uploadResult.message }}
        </div>

        <!-- OCR 结果 -->
        <div v-if="ocrResultText" class="mt-4 p-4 bg-gray-50 rounded-md">
          <h2 class="text-lg font-semibold text-gray-900">OCR 结果</h2>
          <pre class="mt-2 text-gray-700 whitespace-pre-wrap">{{ ocrResultText }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getSignedUrl, uploadFile } from './oss';
import { openai } from './ocr';
const ossPublicUrl = 'https://ocr-cdn.sanbei101.tech';

// 响应式变量
const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);
const imageUrl = ref<string | null>(null);
const ocrResult = ref<string | null>(null);

const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    selectedFile.value = file;
    imageUrl.value = URL.createObjectURL(file);
    uploadResult.value = null;
    ocrResult.value = null;
  }
};

// 处理文件上传
const handleSubmit = async () => {
  if (!selectedFile.value) {
    uploadResult.value = { success: false, message: '请选择文件' };
    return;
  }

  isUploading.value = true;
  uploadResult.value = null;

  try {
    const { signedUrl } = await getSignedUrl(selectedFile.value);
    await uploadFile(selectedFile.value, signedUrl);
    uploadResult.value = { success: true, message: '上传成功！' };
  } catch (error) {
    uploadResult.value = {
      success: false,
      message: error instanceof Error ? error.message : '上传失败'
    };
  } finally {
    console.log(`${ossPublicUrl}/${selectedFile.value.name}`);
    await getOCRResult(`${ossPublicUrl}/${selectedFile.value.name}`);
    isUploading.value = false;
  }
};

const ocrResultText = ref<string>('');
const getOCRResult = async (imageUrl: string) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'qwen-vl-plus',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: '你是一个数学latex大师,现在需要你识别出数学题目,其中的数学公式以latex的形式返回'
            },
            {
              type: 'image_url',
              image_url: {
                url: imageUrl
              }
            }
          ]
        }
      ],
      stream: true
    });

    for await (const part of response) {
      if (part.choices[0]?.delta?.content) {
        ocrResultText.value += part.choices[0].delta.content;
      }
    }
  } catch (error) {
    console.error('OCR请求失败', error);
  }
};
</script>
