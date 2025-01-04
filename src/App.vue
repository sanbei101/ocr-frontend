<template>
  <div class="n-wrapper p-8">
    <n-card class="w-full max-w-3xl mx-auto">
      <template #header>
        <h1 class="text-3xl font-bold text-center text-gray-900">⭐ 数学公式OCR</h1>
      </template>
      <div class="flex flex-col items-center space-y-4">
        <!-- 文件上传 -->
        <n-upload
          directory-dnd
          list-type="image"
          :max="10"
          :on-change="handleFileChange"
          :custom-request="customRequest">
          <n-upload-dragger>
            <div style="margin-bottom: 12px">
              <n-icon size="48" :depth="3">
                <ArchiveIcon />
              </n-icon>
            </div>
          </n-upload-dragger>
        </n-upload>

        <!-- 图片预览 -->
        <n-image v-if="imageUrl" :src="imageUrl" width="300" height="200" />

        <!-- 上传结果 -->
        <n-alert v-if="uploadResult" :status="uploadResult.success ? 'success' : 'error'" closable>
          {{ uploadResult.message }}
        </n-alert>

        <!-- OCR 结果 -->
        <n-card v-if="ocrResultText" title="OCR 结果" class="mt-4 w-full">
          <pre class="text-gray-700 whitespace-pre-wrap">{{ ocrResultText }}</pre>
        </n-card>
      </div>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getSignedUrl, uploadFile } from './oss';
import { openai } from './ocr';
import {
  NCard,
  NAlert,
  NUpload,
  NImage,
  NIcon,
  NUploadDragger,
  type UploadFileInfo
} from 'naive-ui';
import { ArchiveOutline as ArchiveIcon } from '@vicons/ionicons5';

// 状态管理
const uploadUrl = ref<string>('');
const selectedFile = ref<File | null>(null);
const isUploading = ref(false);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);
const imageUrl = ref<string>('');
const ocrResultText = ref<string>('');
const abortController = ref<AbortController | null>(null);

// 重置所有状态
const resetState = () => {
  uploadUrl.value = '';
  isUploading.value = false;
  uploadResult.value = null;
  ocrResultText.value = '';
};

// 文件变更处理
const handleFileChange = async (fileInfo: { file: Required<UploadFileInfo> }) => {
  try {
    resetState();
    const file = fileInfo.file.file;
    if (!file) {
      throw new Error('未选择文件');
    }
    selectedFile.value = file;
    imageUrl.value = URL.createObjectURL(file);
  } catch (error) {
    console.error('File change error:', error);
    uploadResult.value = {
      success: false,
      message: `文件处理失败: ${error || '未知错误'}`
    };
  }
};

// 自定义上传请求
const customRequest = async () => {
  if (!selectedFile.value || isUploading.value) {
    return;
  }

  try {
    const signedUrl = await getSignedUrl(selectedFile.value.name);
    uploadUrl.value = signedUrl;
    isUploading.value = true;

    await uploadFile(selectedFile.value, uploadUrl.value);

    uploadResult.value = {
      success: true,
      message: '文件上传成功'
    };

    // 等待CDN同步
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 开始OCR识别
    const image_url = `https://ocr-cdn.sanbei101.tech/${selectedFile.value.name}`;
    await getOCRResult(image_url);
  } catch (error) {
    console.error('Upload error:', error);
    uploadResult.value = {
      success: false,
      message: `上传失败: ${error || '未知错误'}`
    };
  } finally {
    isUploading.value = false;
  }
};

// OCR识别
const getOCRResult = async (imageUrl: string): Promise<void> => {
  abortController.value = new AbortController();

  try {
    ocrResultText.value = ''; // 清空之前的结果

    const response = await openai.chat.completions.create(
      {
        model: 'glm-4v-flash',
        messages: [
          {
            role: 'system',
            content: `你是一个数学latex大师,
                    现在需要你识别用户的图片中的数学题目,
                    其中的数学公式以latex的形式返回,
                    请注意你只需要给出题目的内容,
                    不能有任意解答,任意的注释,任意的无关内容`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: '你只需要给我题目的内容!不需要废话,不需要解答,不需要注释!'
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
      },
      {
        signal: abortController.value.signal
      }
    );

    for await (const part of response) {
      if (part.choices[0]?.delta?.content) {
        ocrResultText.value += part.choices[0].delta.content;
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('OCR请求已中止');
    } else {
      console.error('OCR请求失败:', error);
      throw error;
    }
  } finally {
    abortController.value = null;
  }
};
</script>
