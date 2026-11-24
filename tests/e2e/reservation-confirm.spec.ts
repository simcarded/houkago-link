import { expect, test } from '@playwright/test';
import { INITIAL_DEMO_SPACES, INITIAL_REGION_STATS } from '../../src/data/demoData';

test.use({ serviceWorkers: 'block' });

test('保存予約は内容を確認するまで送信しない', async ({ page }) => {
  const space = { ...INITIAL_DEMO_SPACES[0], isDemo: false };
  let posts = 0;
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { authenticated: true, user: { sub:'test', displayName:'Test', isAdmin:false } } });
    if (path === '/api/spaces') return route.fulfill({ json: { spaces:[space] } });
    if (path === '/api/disparity') return route.fulfill({ json: { regions:INITIAL_REGION_STATS } });
    if (path === '/api/favorites') return route.fulfill({ json: { favoriteIds:[] } });
    if (path === '/api/availability') return route.fulfill({ json: { availableSeats:3 } });
    if (path === '/api/reservations' && route.request().method() === 'GET') return route.fulfill({ json: { reservations:[] } });
    if (path === '/api/reservations') { posts++; return route.fulfill({ status:201, json:{ok:true,id:'res-test'} }); }
    return route.fulfill({ status:404, json:{} });
  });
  await page.goto('/');
  await page.getByRole('heading', { name:space.name }).click();
  await page.getByRole('button', { name:'予約内容を確認', exact:true }).click();
  await expect(page.getByRole('heading', { name:'予約内容の確認', exact:true })).toBeVisible();
  await expect(page.getByText(/選択日時の空席: 3席/)).toBeVisible();
  expect(posts).toBe(0);
  await page.getByRole('button', { name:'この内容で確定' }).click();
  await expect(page.getByText('予約を登録しました')).toBeVisible();
  expect(posts).toBe(1);
});

test('閉じた施設の遅い空席応答を別の施設に表示しない', async ({ page }) => {
  const [rawFirst, rawSecond] = INITIAL_DEMO_SPACES;
  const first = { ...rawFirst, isDemo: false };
  const second = { ...rawSecond, isDemo: false };
  let releaseFirst!: () => void;
  const firstPending = new Promise<void>((resolve) => { releaseFirst = resolve; });
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/api/auth/me') return route.fulfill({json:{authenticated:true,user:{sub:'test',displayName:'Test',isAdmin:false}}});
    if (url.pathname === '/api/spaces') return route.fulfill({json:{spaces:[first,second]}});
    if (url.pathname === '/api/disparity') return route.fulfill({json:{regions:INITIAL_REGION_STATS}});
    if (url.pathname === '/api/favorites') return route.fulfill({json:{favoriteIds:[]}});
    if (url.pathname === '/api/reservations') return route.fulfill({json:{reservations:[]}});
    if (url.pathname === '/api/availability') {
      if (url.searchParams.get('spaceId') === first.id) { await firstPending; return route.fulfill({json:{availableSeats:0}}).catch(() => {}); }
      return route.fulfill({json:{availableSeats:3}});
    }
    return route.fulfill({status:404,json:{}});
  });
  await page.goto('/');
  await page.getByRole('heading',{name:first.name}).click();
  await page.getByRole('button',{name:'予約内容を確認',exact:true}).click();
  await expect(page.getByText('選択日時の空席を確認中…')).toBeVisible();
  await page.getByRole('button',{name:'閉じる'}).click();
  await page.getByRole('heading',{name:second.name}).click();
  await page.getByRole('button',{name:'予約内容を確認',exact:true}).click();
  await expect(page.getByText(/選択日時の空席: 3席/)).toBeVisible();
  releaseFirst();
  await expect(page.getByText(/選択日時の空席: 3席/)).toBeVisible();
});

