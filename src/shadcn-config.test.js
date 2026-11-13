import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// shadcn 설정(components.json)과 경로 설정(jsconfig.json)이 의도한 값에서 벗어나지 않았는지 지킨다.
// (스타일과 부품 라이브러리는 shadcn을 설치한 뒤에는 바꿀 수 없어서, 실수로 바뀌면 바로 알아야 한다)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf-8'));

describe('components.json (shadcn 설정)', () => {
  const config = readJson('components.json');

  it('현재 shadcn 기본 스타일(base-nova: Base UI + nova)이다', () => {
    expect(config.style).toBe('base-nova');
  });

  it('JavaScript 프로젝트로 설정되어 있다 (.jsx 파일을 만든다)', () => {
    expect(config.tsx).toBe(false);
    expect(config.rsc).toBe(false);
  });

  it('Tailwind 4 방식이다 (설정 파일 없이 CSS 변수를 쓴다)', () => {
    expect(config.tailwind.config).toBe('');
    expect(config.tailwind.cssVariables).toBe(true);
    expect(config.tailwind.css).toBe('src/index.css');
  });

  it('기준 색은 neutral, 아이콘은 lucide다', () => {
    expect(config.tailwind.baseColor).toBe('neutral');
    expect(config.iconLibrary).toBe('lucide');
  });

  it('파일 위치 별칭이 @/ 아래의 약속된 폴더를 가리킨다', () => {
    expect(config.aliases).toEqual({
      components: '@/components',
      utils: '@/lib/utils',
      ui: '@/components/ui',
      lib: '@/lib',
      hooks: '@/hooks',
    });
  });
});

describe('jsconfig.json (@ 경로 별칭)', () => {
  it('@/ 가 src 폴더를 가리킨다', () => {
    expect(readJson('jsconfig.json').compilerOptions.paths).toEqual({ '@/*': ['./src/*'] });
  });
});
