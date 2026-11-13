// 모든 시험 파일이 실행되기 전에 한 번 읽히는 공통 설정.
import '@testing-library/jest-dom/vitest'; // toBeInTheDocument() 같은 화면 확인용 문장 추가
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 시험이 하나 끝날 때마다 그려 둔 화면을 치워서, 다음 시험에 영향을 주지 않게 한다.
afterEach(() => {
  cleanup();
});
