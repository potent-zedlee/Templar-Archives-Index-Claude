/**
 * PWA 아이콘 생성 스크립트 (Placeholder)
 *
 * 실제 운영 환경에서는 sharp 또는 다른 이미지 처리 라이브러리를 사용하여
 * 고품질 PNG 아이콘을 생성해야 합니다.
 *
 * 현재는 SVG placeholder를 PNG로 변환하는 간단한 스크립트입니다.
 */

const fs = require('fs')
const path = require('path')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const iconsDir = path.join(__dirname, '../public/icons')

// SVG template (Templar Archives 로고 placeholder)
const generateSVG = (size) => `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#000000"/>
  <g transform="translate(${size / 2}, ${size / 2})">
    <!-- Templar Cross -->
    <rect x="${-size / 12}" y="${-size / 3}" width="${size / 6}" height="${(2 * size) / 3}" fill="#F59E0B"/>
    <rect x="${-size / 4}" y="${-size / 12}" width="${size / 2}" height="${size / 6}" fill="#F59E0B"/>
    <!-- Poker Chip Circle -->
    <circle cx="0" cy="0" r="${size / 3.5}" fill="none" stroke="#F59E0B" stroke-width="${size / 40}"/>
  </g>
  <text x="50%" y="85%" text-anchor="middle" fill="#F59E0B" font-family="Arial, sans-serif" font-size="${size / 10}" font-weight="bold">TEMPLAR</text>
</svg>`

// SVG 파일 생성
sizes.forEach((size) => {
  const svg = generateSVG(size)
  const filename = `icon-${size}x${size}.svg`
  fs.writeFileSync(path.join(iconsDir, filename), svg)
  console.log(`Generated ${filename}`)
})

console.log('\nPlaceholder icons generated successfully!')
console.log('⚠️  실제 운영 환경에서는 디자이너가 제작한 PNG 아이콘으로 교체하세요.')
console.log('   추천 도구: https://realfavicongenerator.net/')
