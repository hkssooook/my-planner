import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// README에 넣은 스크린샷이 깨진 그림이 되지 않도록 확인한다.
// (파일 이름을 바꾸거나 지웠는데 README는 그대로일 때, 이 시험이 실패한다)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf-8');

// 마크다운 ![설명](주소) 와 HTML <img src="주소" alt="설명"> 를 모두 찾는다
const markdownImages = [...readme.matchAll(/!\[([^\]]*)\]\(([^)\s]+)\)/g)].map(([, alt, src]) => ({ alt, src }));
const htmlImages = [...readme.matchAll(/<img\s[^>]*>/g)].map(([tag]) => ({
  src: tag.match(/src="([^"]*)"/)?.[1],
  alt: tag.match(/alt="([^"]*)"/)?.[1],
}));
const images = [...markdownImages, ...htmlImages].filter((img) => !/^https?:/.test(img.src ?? ''));

describe('README의 스크린샷', () => {
  it('스크린샷이 4장 들어 있다', () => {
    expect(images.map((i) => i.src).sort()).toEqual([
      'docs/images/detail-popup.png',
      'docs/images/fit-mode.png',
      'docs/images/overview.png',
      'docs/images/period-popup.png',
    ]);
  });

  it.each(images.map((i) => [i.src, i]))('%s 파일이 실제로 있고, PNG 그림이고, 너무 크지 않다', (src) => {
    const file = path.join(root, src);
    expect(fs.existsSync(file), `${src} 없음`).toBe(true);
    const bytes = fs.readFileSync(file);
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); // PNG 파일의 첫 8바이트
    expect(bytes.length, `${src} 크기`).toBeLessThan(400 * 1024); // 저장소가 무거워지지 않게
  });

  it.each(images.map((i) => [i.src, i]))('%s 에 대체 글(alt)이 있다 (그림을 못 보는 사람을 위해)', (_src, img) => {
    expect((img.alt ?? '').trim().length, '대체 글').toBeGreaterThan(10);
  });

  it('docs/images 폴더에 README가 쓰지 않는 그림이 남아 있지 않다', () => {
    const used = new Set(images.map((i) => path.basename(i.src)));
    const files = fs.readdirSync(path.join(root, 'docs/images'));
    expect(files.filter((f) => !used.has(f))).toEqual([]);
  });
});
