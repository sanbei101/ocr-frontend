<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 class="text-3xl font-bold text-center text-gray-900 mb-6">⭐数学公式OCR</h1>
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
        <div v-if="ocrResultText" class="mt-4 p-4 bg-gray-50 rounded-md w-full overflow-auto">
          <h2 class="text-lg font-semibold text-gray-900">OCR 结果</h2>
          <pre class="mt-2 text-gray-700 whitespace-pre-wrap text-left">{{ ocrResultText }}</pre>
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

const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);
const imageUrl = ref<string | null>(null);
const ocrResultText = ref<string>('');
let abortController: AbortController | null = null;

// 处理文件选择
const handleFileChange = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0] || null;
  if (file) {
    selectedFile.value = file;
    imageUrl.value = URL.createObjectURL(file);
    resetState();
  }
};

// 重置状态
const resetState = () => {
  isUploading.value = false;
  uploadResult.value = null;
  ocrResultText.value = '';
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
};

// 处理文件上传
const handleSubmit = async () => {
  if (!selectedFile.value) {
    uploadResult.value = { success: false, message: '请选择文件' };
    return;
  }

  resetState();
  isUploading.value = true;

  try {
    const { signedUrl } = await getSignedUrl(selectedFile.value);
    await uploadFile(selectedFile.value, signedUrl);
    uploadResult.value = { success: true, message: '上传成功！' };
    await fetchOCRResult(`${ossPublicUrl}/${selectedFile.value.name}`);
  } catch (error: any) {
    uploadResult.value = {
      success: false,
      message: error?.message || '上传失败'
    };
  } finally {
    isUploading.value = false;
  }
};

// 获取 OCR 结果
const fetchOCRResult = async (imageUrl: string) => {
  abortController = new AbortController();
  try {
    const response = await openai.chat.completions.create(
      {
        model: 'glm-4v-flash',
        messages: [
          {
            role: 'system',
            content: `你是一个数学latex大师,
                      现在需要你识别用户的图片中的数学题目，
                      其中的数学公式以latex的形式返回,
                      请注意你只需要给出题目的内容，
                      不能有任意解答,任意的注释,任意的无关内容。`
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: '你只需要给我题目的内容!不需要废话,不需要解答,不需要注释!' },
              { type: 'image_url', image_url: { url: imageUrl } }
            ]
          }
        ],
        stream: true
      },
      { signal: abortController.signal }
    );

    for await (const part of response) {
      const content = part.choices?.[0]?.delta?.content;
      if (content) {
        ocrResultText.value += content;
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('OCR 请求失败', error);
    }
  } finally {
    abortController = null;
  }
};
</script>
