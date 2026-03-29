// 美颜滤镜：磨皮、美白、瘦脸、肤色，基于 PixelData 处理

export interface BeautySettings {
  smoothing: number  // 0-100 磨皮
  whitening: number  // 0-100 美白
  faceSlimming: number  // 0-100 瘦脸
  skinTone: number   // 0-100 肤色（50=中性，<50冷，>50暖）
}

export const defaultBeautySettings: BeautySettings = {
  smoothing: 30,
  whitening: 20,
  faceSlimming: 0,
  skinTone: 50,
}

export class BeautyFilter {
  private canvas: OffscreenCanvas | null = null
  private ctx: OffscreenCanvasRenderingContext2D | null = null

  constructor(width: number, height: number) {
    if (typeof OffscreenCanvas !== "undefined") {
      this.canvas = new OffscreenCanvas(width, height)
      this.ctx = this.canvas.getContext("2d")
    }
  }

  applyBeautyFilter(imageData: ImageData, settings: BeautySettings): ImageData {
    const data = new Uint8ClampedArray(imageData.data)
    const { width, height } = imageData

    if (settings.smoothing > 0) {
      this.applySmoothing(data, width, height, settings.smoothing / 100)
    }
    if (settings.whitening > 0) {
      this.applyWhitening(data, settings.whitening / 100)
    }
    if (settings.skinTone !== 50) {
      this.applySkinTone(data, settings.skinTone / 100)
    }
    if (settings.faceSlimming > 0) {
      return this.applyFaceSlimming(data, width, height, settings.faceSlimming / 100)
    }

    return new ImageData(data, width, height)
  }

  // 磨皮：box blur，强度越高 radius 越大
  private applySmoothing(data: Uint8ClampedArray, width: number, height: number, strength: number): void {
    const radius = Math.max(1, Math.round(strength * 6)) // 1-6px
    const temp = new Uint8ClampedArray(data)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let r = 0, g = 0, b = 0, count = 0

        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const ny = Math.min(height - 1, Math.max(0, y + dy))
            const nx = Math.min(width - 1, Math.max(0, x + dx))
            const idx = (ny * width + nx) * 4
            r += temp[idx]
            g += temp[idx + 1]
            b += temp[idx + 2]
            count++
          }
        }

        const i = (y * width + x) * 4
        // 与原始像素混合，保留细节
        const blend = strength * 0.7
        data[i]     = Math.round(data[i]     * (1 - blend) + (r / count) * blend)
        data[i + 1] = Math.round(data[i + 1] * (1 - blend) + (g / count) * blend)
        data[i + 2] = Math.round(data[i + 2] * (1 - blend) + (b / count) * blend)
      }
    }
  }

  // 美白：提亮 + 冷调修正
  private applyWhitening(data: Uint8ClampedArray, strength: number): void {
    const rBoost = strength * 60   // 红通道提亮
    const gBoost = strength * 50   // 绿通道提亮
    const bBoost = strength * 40   // 蓝通道提亮（略少保持肤色）

    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, data[i]     + rBoost)
      data[i + 1] = Math.min(255, data[i + 1] + gBoost)
      data[i + 2] = Math.min(255, data[i + 2] + bBoost)
    }
  }

  // 肤色：冷暖色调调整
  private applySkinTone(data: Uint8ClampedArray, tone: number): void {
    // tone < 0.5 冷调（蓝）, > 0.5 暖调（橙）
    const shift = (tone - 0.5) * 40
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = Math.min(255, Math.max(0, data[i]     + shift))       // R
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] - shift * 0.5)) // B 反向
    }
  }

  // 瘦脸：对画面中心区域水平压缩
  private applyFaceSlimming(data: Uint8ClampedArray, width: number, height: number, strength: number): ImageData {
    const result = new Uint8ClampedArray(data.length)
    // 复制 alpha
    for (let i = 3; i < data.length; i += 4) result[i] = data[i]

    // 压缩区域：画面中间 60% 高度
    const yStart = Math.floor(height * 0.2)
    const yEnd   = Math.floor(height * 0.8)
    const squeeze = 1 - strength * 0.15  // 最大压缩 15%
    const centerX = width / 2

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const di = (y * width + x) * 4

        let srcX = x
        if (y >= yStart && y <= yEnd) {
          // 距离中心越远压缩越强
          const distFromCenter = x - centerX
          srcX = Math.round(centerX + distFromCenter / squeeze)
        }

        if (srcX >= 0 && srcX < width) {
          const si = (y * width + srcX) * 4
          result[di]     = data[si]
          result[di + 1] = data[si + 1]
          result[di + 2] = data[si + 2]
          result[di + 3] = data[si + 3]
        }
      }
    }

    return new ImageData(result, width, height)
  }

  // 更新画布尺寸
  resize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width
      this.canvas.height = height
    }
  }

  destroy(): void {
    this.canvas = null
    this.ctx = null
  }
}
