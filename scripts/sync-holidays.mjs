// 공휴일 동기화: 한국천문연구원 특일 정보 API에서 공휴일을 받아 src/data/holidays.generated.json 으로 저장한다.
//
// 사용법 (프로젝트 폴더에서):
//   npm run sync-holidays                 앱의 연도 선택지와 같은 범위 (올해 -1년 ~ +3년)
//   npm run sync-holidays -- 2026 2027    연도를 직접 지정
//   npm run sync-holidays -- --dry-run    파일은 쓰지 않고 결과와 현재 앱 데이터와의 차이만 보여 준다
//
// 인증키는 .env 파일의 DATA_GO_KR_SERVICE_KEY 에서 읽는다. (.env는 git에 올라가지 않는다. 설명: docs/holiday-data.md)
// 이 스크립트는 브라우저가 아니라 내 컴퓨터에서만 돌고, 앱에는 결과 파일(JSON)만 들어간다. 그래서 키가 배포물에 섞이지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeServiceKey, sortByDate } from './holidays-parse.mjs';
import { fetchYearHolidays } from './holidays-fetch.mjs';
import { KR_HOLIDAYS } from '../src/data/holidays.js';
import { getCurrentYear, getYearOptions } from '../src/utils/date.js';
import { YEAR_RANGE } from '../src/constants/calendar.js';

const OUTPUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/holidays.generated.json');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 앱의 연도 선택지와 같은 범위 (앱과 같은 함수를 써서, 앱의 범위가 바뀌면 자동으로 따라간다)
const defaultYears = () => getYearOptions(getCurrentYear(), YEAR_RANGE);

// 현재 앱 데이터와 새로 받은 데이터를 비교해, 사람이 읽을 수 있는 줄들로 돌려준다
const diffLines = (year, fresh) => {
  const current = KR_HOLIDAYS[year] ?? {};
  const lines = [];
  for (const [date, name] of Object.entries(fresh)) {
    if (!(date in current)) lines.push(`    + ${date} ${name}   (앱에 없던 날)`);
    else if (current[date] !== name) lines.push(`    ~ ${date} ${current[date]} → ${name}   (이름이 다름)`);
  }
  for (const [date, name] of Object.entries(current)) {
    if (!(date in fresh)) lines.push(`    - ${date} ${name}   (API에는 없는 날)`);
  }
  return lines;
};

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const requested = args.filter((a) => /^\d{4}$/.test(a)).map(Number);
  const years = requested.length > 0 ? requested : defaultYears();

  const key = normalizeServiceKey(process.env.DATA_GO_KR_SERVICE_KEY);
  if (!key || key.includes('여기에')) {
    console.error('인증키가 없습니다.');
    console.error('1) docs/holiday-data.md 의 순서대로 공공데이터포털에서 인증키를 발급받고');
    console.error('2) 프로젝트 폴더의 .env 파일에  DATA_GO_KR_SERVICE_KEY=발급받은키  한 줄을 적으세요. (.env.example 참고)');
    console.error('   키는 채팅이나 코드에 붙여 넣지 마세요.');
    process.exitCode = 1;
    return;
  }

  console.log(`${years.join(', ')}년의 공휴일을 받아 옵니다...${dryRun ? ' (--dry-run: 파일은 쓰지 않습니다)' : ''}`);
  const fetched = {};
  const errors = [];
  for (const year of years) {
    try {
      fetched[year] = await fetchYearHolidays(key, year);
    } catch (error) {
      errors.push(error.message);
    }
    await sleep(300); // 서버에 한꺼번에 몰리지 않게
  }

  if (errors.length > 0) {
    console.error('\n실패했습니다. 파일은 바꾸지 않았습니다.');
    for (const message of errors) console.error(`  - ${message}`);
    process.exitCode = 1;
    return;
  }

  // 받은 해만 덮어쓰고, 데이터가 아직 없는 해(예: 아직 고시 전인 먼 미래)는 이전 값을 그대로 둔다
  let previous = {};
  if (fs.existsSync(OUTPUT)) previous = JSON.parse(fs.readFileSync(OUTPUT, 'utf-8'));
  const next = { ...previous };
  for (const year of years) {
    const holidays = fetched[year];
    const count = Object.keys(holidays).length;
    if (count === 0) {
      console.log(`\n${year}년: API에 공휴일 데이터가 아직 없습니다. 이전 값을 그대로 둡니다.`);
      continue;
    }
    next[year] = holidays;
    const lines = diffLines(year, holidays);
    console.log(`\n${year}년: 공휴일 ${count}일. 현재 앱 데이터와 ${lines.length === 0 ? '같습니다' : `다른 곳 ${lines.length}군데`}`);
    for (const line of lines) console.log(line);
  }

  const sorted = Object.fromEntries(Object.entries(next).sort(([a], [b]) => Number(a) - Number(b)).map(([y, h]) => [y, sortByDate(h)]));
  if (dryRun) {
    console.log('\n(--dry-run) 파일을 쓰지 않았습니다.');
    return;
  }
  fs.writeFileSync(OUTPUT, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`\n저장했습니다: ${path.relative(process.cwd(), OUTPUT)}`);
  console.log('다음 단계: 결과를 확인한 뒤 앱이 이 파일을 읽도록 바꿉니다. (docs/holiday-data.md)');
};

main().catch((error) => {
  // 예상하지 못한 오류에도 요청 주소(인증키)가 새지 않도록 메시지 대신 종류만 보여 준다
  console.error(`예상하지 못한 오류: ${error?.name ?? 'Error'}`);
  process.exitCode = 1;
});
