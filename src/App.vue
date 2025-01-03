<template>
  <div class="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
    <div class="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-md">
      <h1 class="text-3xl font-bold text-center text-gray-900 mb-6">
        Upload Image
      </h1>
      <div class="flex flex-col items-center space-y-4">
        <!-- 文件选择 -->
        <input
          type="file"
          @change="handleFileChange"
          class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          accept="image/*"
        />

        <!-- 图片预览 -->
        <div v-if="imageUrl" class="mt-4">
          <img
            :src="imageUrl"
            alt="Preview"
            class="rounded-lg"
            width="300"
            height="200"
          />
        </div>

        <!-- 上传按钮 -->
        <button
          @click="handleSubmit"
          :disabled="isUploading"
          class="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div v-if="isUploading" class="flex items-center justify-center">
            <div
              class="w-5 h-5 border-2 border-white border-t-2 border-t-transparent rounded-full animate-spin"
            ></div>
            <span class="ml-2">Uploading...</span>
          </div>
          <span v-else>上传</span>
        </button>

        <!-- 上传结果 -->
        <div
          v-if="uploadResult"
          :class="`mt-4 p-4 rounded-md ${
            uploadResult.success
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`"
        >
          {{ uploadResult.message }}
        </div>

        <!-- OCR 结果 -->
        <div v-if="ocrResult" class="mt-4 p-4 bg-gray-50 rounded-md">
          <h2 class="text-lg font-semibold text-gray-900">OCR 结果</h2>
          <pre class="mt-2 text-gray-700 whitespace-pre-wrap">{{
            ocrResult
          }}</pre>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import axios from "axios";

// 响应式变量
const selectedFile = ref<File | null>(null); // 更改名称，避免与类型冲突
const isUploading = ref<boolean>(false);
const uploadResult = ref<{ success: boolean; message: string } | null>(null);
const imageUrl = ref<string | null>(null);
const ocrResult = ref<string | null>(null);

// 处理文件选择
const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0];
    imageUrl.value = URL.createObjectURL(selectedFile.value); // 显示预览图片
    uploadResult.value = null; // 重置上传结果
    ocrResult.value = null; // 重置 OCR 结果
  }
  console.log(imageUrl);
};

// 处理文件上传
const handleSubmit = async () => {
  if (!selectedFile.value) {
    console.error("No file selected");
    uploadResult.value = { success: false, message: "请选择文件" };
    return;
  }

  isUploading.value = true;
  uploadResult.value = null; // 重置上传结果

  try {
    // 获取预签名 URL
    const { signedUrl } = await getSignedUrl(selectedFile.value);

    uploadFile(selectedFile.value, signedUrl);
  } catch (error) {
    console.error("Error during file upload:", error);
    uploadResult.value = { success: false, message: error as string };
  } finally {
    isUploading.value = false;
  }
};

// 获取预签名的 URL
const getSignedUrl = async (file: File) => {
  try {
    // 请求服务端生成预签名 URL
    const response = await axios.get(
      "https://ocr-go-backend-ksglcimcak.cn-beijing.fcapp.run/get-presign",
      {
        params: {
          objectName: file.name,
        },
      }
    );

    const { url: signedUrl } = response.data;

    if (!signedUrl) {
      throw new Error("Failed to get signed URL");
    }

    return { signedUrl };
  } catch (error) {
    console.error("Error getting signed URL:", error);
    throw new Error("获取上传链接失败");
  }
};

// 上传文件到OSS
const uploadFile = (file: File, signedUrl: string) => {
  console.log("Uploading file in uploadFile:", file); // 调试日志

  // 使用 FileReader 读取文件并通过回调上传
  const reader = new FileReader();

  reader.onloadend = function () {
    const fileBuffer = reader.result as ArrayBuffer; // 获取读取到的 ArrayBuffer

    fetch(signedUrl, {
      method: "PUT",
      body: fileBuffer,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to upload file");
        }
        uploadResult.value = { success: true, message: "上传成功！" };
      })
      .catch((error) => {
        console.error("Error uploading file:", error);
        uploadResult.value = { success: false, message: "上传过程中发生错误" };
      });
  };
  reader.readAsArrayBuffer(file);
};
</script>
