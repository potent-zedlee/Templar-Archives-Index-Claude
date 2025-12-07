import sharp from 'sharp'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const iconsDir = join(__dirname, '../public/icons')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

async function convertSvgToPng() {
  for (const size of sizes) {
    const svgFile = join(iconsDir, `icon-${size}x${size}.svg`)
    const pngFile = join(iconsDir, `icon-${size}x${size}.png`)

    try {
      const svgBuffer = readFileSync(svgFile)
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngFile)
      console.log(`Converted icon-${size}x${size}.png`)
    } catch (error) {
      console.error(`Error converting ${size}x${size}:`, error.message)
    }
  }

  // badge 아이콘 생성 (72x72, 푸시 알림용)
  try {
    const svgBuffer = readFileSync(join(iconsDir, 'icon-72x72.svg'))
    await sharp(svgBuffer)
      .resize(72, 72)
      .png()
      .toFile(join(iconsDir, 'badge-72x72.png'))
    console.log('Converted badge-72x72.png')
  } catch (error) {
    console.error('Error converting badge:', error.message)
  }

  console.log('\nAll icons converted successfully!')
}

convertSvgToPng()
