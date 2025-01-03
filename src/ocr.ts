import { OpenAI } from 'openai';

export const openai = new OpenAI({
  apiKey: 'sk-5102e47a882642078cc5b27fa4dfdbaf',
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
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
