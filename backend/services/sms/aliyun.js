const Dysmsapi20170525 = require('@alicloud/dysmsapi20170525');
const OpenApi = require('@alicloud/openapi-client');
const Util = require('@alicloud/tea-util');

function createClient() {
  const config = new OpenApi.Config({
    accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
  });
  config.endpoint = 'dysmsapi.aliyuncs.com';
  return new Dysmsapi20170525.default(config);
}

exports.sendSms = async ({ phoneNumber, signName, templateCode, params }) => {
  const client = createClient();
  const request = new Dysmsapi20170525.SendSmsRequest({
    phoneNumbers: phoneNumber,
    signName: signName || process.env.SMS_SIGN_NAME,
    templateCode,
    templateParam: JSON.stringify(params || {}),
  });
  
  console.log('📱 准备发送短信:', {
    phoneNumber,
    signName: signName || process.env.SMS_SIGN_NAME,
    templateCode,
    params
  });
  
  const runtime = new Util.RuntimeOptions({});
  const res = await client.sendSmsWithOptions(request, runtime);
  const code = String(res?.body?.code || '');
  
  console.log('📨 阿里云响应:', {
    code: res?.body?.code,
    message: res?.body?.message,
    requestId: res?.body?.requestId,
    bizId: res?.body?.bizId
  });
  
  if (code !== 'OK') {
    const msg = `${res?.body?.code || 'UNKNOWN'}: ${res?.body?.message || ''}`;
    const err = new Error(`Aliyun SMS send failed: ${msg}`);
    err.code = res?.body?.code;
    err.requestId = res?.body?.requestId;
    throw err;
  }
  
  // 延迟查询发送状态
  if (res?.body?.bizId) {
    setTimeout(async () => {
      try {
        const status = await exports.querySendDetails({
          phoneNumber,
          bizId: res.body.bizId,
          sendDate: new Date().toISOString().split('T')[0].replace(/-/g, '')
        });
        console.log('📊 短信发送状态:', status);
      } catch (err) {
        console.error('查询短信状态失败:', err.message);
      }
    }, 3000); // 3秒后查询
  }
  
  return res?.body;
};

// 查询短信发送详情
exports.querySendDetails = async ({ phoneNumber, bizId, sendDate }) => {
  const client = createClient();
  const request = new Dysmsapi20170525.QuerySendDetailsRequest({
    phoneNumber,
    bizId,
    sendDate, // 格式: 20231018
    pageSize: 10,
    currentPage: 1
  });
  const runtime = new Util.RuntimeOptions({});
  const res = await client.querySendDetailsWithOptions(request, runtime);
  
  if (res?.body?.code === 'OK' && res?.body?.smsSendDetailDTOs?.smsSendDetailDTO?.length > 0) {
    const detail = res.body.smsSendDetailDTOs.smsSendDetailDTO[0];
    return {
      phoneNumber: detail.phoneNum,
      sendStatus: detail.sendStatus, // 1-等待回执 2-发送失败 3-发送成功
      errCode: detail.errCode,
      templateCode: detail.templateCode,
      content: detail.content,
      receiveDate: detail.receiveDate,
      sendDate: detail.sendDate
    };
  }
  
  return res?.body;
};



