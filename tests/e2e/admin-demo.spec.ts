import { expect, test } from '@playwright/test';
import { INITIAL_DEMO_SPACES } from '../../src/data/demoData';

test.use({ serviceWorkers: 'block' });

function sampleSpace(id: number) {
  const base = INITIAL_DEMO_SPACES[0];
  return {
    ...base,
    id: `sample-${id}`,
    name: `サンプル学習場所 ${id}`,
    address: 'サンプル地点（実在住所ではありません）',
    regionName: '愛知県内サンプル',
    isDemo: true,
    isPublished: false,
  };
}

test('管理リンクは開けて、管理者だけがサンプルを追加・削除できる', async ({ page }) => {
  let samples = Array.from({ length: 100 }, (_, index) => sampleSpace(index + 1));
  const mutations: Array<{ method: string; body?: Record<string, unknown> }> = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    const method = route.request().method();
    if (url.pathname === '/api/auth/me') return route.fulfill({ json: { authenticated: true, user: { sub: 'admin', displayName: '管理者', isAdmin: true } } });
    if (url.pathname === '/api/spaces' && method === 'GET') {
      return route.fulfill({ json: { spaces: url.searchParams.has('includeUnpublished') ? samples : [] } });
    }
    if (url.pathname === '/api/spaces' && method === 'POST') {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      mutations.push({ method, body });
      samples = [...samples, { ...sampleSpace(samples.length + 1), id: 'sample-new', name: String(body.name), isDemo: body.isDemo === true }];
      return route.fulfill({ status: 201, json: { ok: true, id: 'sample-new' } });
    }
    if (url.pathname.startsWith('/api/spaces/sample-') && method === 'DELETE') {
      mutations.push({ method });
      samples = samples.filter((space) => space.id !== url.pathname.split('/').at(-1));
      return route.fulfill({ json: { ok: true } });
    }
    if (url.pathname === '/api/reservations') return route.fulfill({ json: { reservations: [] } });
    if (url.pathname === '/api/favorites') return route.fulfill({ json: { favoriteIds: [] } });
    return route.fulfill({ status: 404, json: {} });
  });

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '管理者コンソール' })).toBeVisible();
  await expect(page.getByText('サンプル 100 件')).toBeVisible();
  await page.getByPlaceholder('施設名').fill('愛知県追加サンプル');
  await page.getByPlaceholder('所在地').fill('サンプル地点（実在住所ではありません）');
  await page.getByRole('button', { name: 'サンプルを追加' }).click();
  await expect(page.getByText('サンプル 101 件')).toBeVisible();
  expect(mutations[0]?.body?.isDemo).toBe(true);

  page.on('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'サンプル学習場所 1を削除' }).click();
  await expect(page.getByText('サンプル 100 件')).toBeVisible();
  expect(mutations.at(-1)?.method).toBe('DELETE');
});

test('管理ページは未ログインで開けるが、編集操作は表示しない', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    if (new URL(route.request().url()).pathname === '/api/auth/me') return route.fulfill({ json: { authenticated: false, user: null } });
    return route.fulfill({ status: 401, json: {} });
  });
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: '管理者権限が必要です' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Googleでログイン' })).toHaveAttribute('href', '/api/auth/login?returnTo=%2Fadmin');
  await expect(page.getByRole('button', { name: 'サンプルを追加' })).toHaveCount(0);
});
