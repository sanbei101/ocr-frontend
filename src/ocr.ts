import { OpenAI } from 'openai';

export const openai = new OpenAI({
  apiKey: '1ae25bb0dd0246db8d1eac8616d00b21.mvFjvKXq1dT9r5k8',
  baseURL: 'https://open.bigmodel.cn/api/paas/v4',
  dangerouslyAllowBrowser: true
});

// export const getOCRResult = async (imageUrl: string) => {
//   const response = await openai.chat.completions.create({
//     model: 'qwen-vl-plus',
//     messages: [
//       {
//         role: 'user',
//         content: [
//           { type: 'text', text: '我需要你识别出其中的数学公式,并以latex的形式返回给我' },
//           {
//             type: 'image_url',
//             image_url: {
//               url: imageUrl
//             }
//           }
//         ]
//       }
//     ],
//     stream: true
//   });
// };
