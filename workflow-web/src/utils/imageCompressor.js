/**
 * 图片压缩工具
 * 用于在上传前压缩图片，减少上传时间和带宽占用
 */

/**
 * 压缩单张图片
 * @param {File} file - 原始图片文件
 * @param {Object} options - 压缩选项
 * @param {number} options.maxWidth - 最大宽度（默认1920px）
 * @param {number} options.maxHeight - 最大高度（默认1080px）
 * @param {number} options.quality - 压缩质量 0-1（默认0.8）
 * @param {boolean} options.maintainAspectRatio - 保持宽高比（默认true）
 * @returns {Promise<File>} 压缩后的图片文件
 */
export const compressImage = (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    maintainAspectRatio = true
  } = options;

  return new Promise((resolve, reject) => {
    // 检查是否为图片
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    
    reader.onerror = () => {
      reject(new Error('读取文件失败'));
    };
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onerror = () => {
        reject(new Error('图片加载失败'));
      };
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // 计算压缩后的尺寸
          if (maintainAspectRatio) {
            if (width > maxWidth || height > maxHeight) {
              const widthRatio = maxWidth / width;
              const heightRatio = maxHeight / height;
              const ratio = Math.min(widthRatio, heightRatio);
              
              width = width * ratio;
              height = height * ratio;
            }
          } else {
            if (width > maxWidth) {
              width = maxWidth;
            }
            if (height > maxHeight) {
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // 转换为 Blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('图片压缩失败'));
                return;
              }

              // 创建新的 File 对象
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now()
              });

              console.log(`[压缩] ${file.name}: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
              
              resolve(compressedFile);
            },
            file.type,
            quality
          );
        } catch (error) {
          reject(error);
        }
      };

      img.src = e.target.result;
    };

    reader.readAsDataURL(file);
  });
};

/**
 * 批量压缩图片
 * @param {File[]} files - 图片文件数组
 * @param {Object} options - 压缩选项（同单张压缩）
 * @returns {Promise<File[]>} 压缩后的图片文件数组
 */
export const compressImages = async (files, options = {}) => {
  const compressPromises = files.map(file => compressImage(file, options));
  return Promise.all(compressPromises);
};

/**
 * 检查文件是否需要压缩
 * @param {File} file - 文件对象
 * @param {number} threshold - 大小阈值（MB），超过此大小才压缩（默认1MB）
 * @returns {boolean} 是否需要压缩
 */
export const shouldCompress = (file, threshold = 1) => {
  const thresholdBytes = threshold * 1024 * 1024;
  return file.size > thresholdBytes && file.type.startsWith('image/');
};

/**
 * 智能压缩 - 只压缩超过阈值的图片
 * @param {File} file - 图片文件
 * @param {Object} options - 压缩选项
 * @param {number} options.threshold - 大小阈值（MB）
 * @returns {Promise<File>} 处理后的文件
 */
export const smartCompress = async (file, options = {}) => {
  const { threshold = 1, ...compressOptions } = options;
  
  if (shouldCompress(file, threshold)) {
    return compressImage(file, compressOptions);
  }
  
  return file;
};

/**
 * 批量智能压缩
 * @param {File[]} files - 文件数组
 * @param {Object} options - 压缩选项
 * @returns {Promise<File[]>} 处理后的文件数组
 */
export const smartCompressMultiple = async (files, options = {}) => {
  const promises = files.map(file => smartCompress(file, options));
  return Promise.all(promises);
};

export default {
  compressImage,
  compressImages,
  shouldCompress,
  smartCompress,
  smartCompressMultiple
};

