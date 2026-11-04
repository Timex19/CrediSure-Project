import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(process.env.E2E_ADMIN_EMAIL!)
  await page
    .getByLabel('Password', { exact: true })
    .fill(process.env.E2E_ADMIN_PASSWORD!)
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await expect(
    page.getByRole('heading', { name: 'A little clarity for your day.' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Updated')
  await expect(
    page
      .getByRole('region', { name: 'Recently joined' })
      .locator('[aria-busy]'),
  ).toHaveAttribute('aria-busy', 'false')
}

test('real API: login, overview, directory filters, pages, history and logout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signIn(page)
  await expect(page.getByLabel('User summary')).toContainText('80')
  await expect(
    page.getByRole('img', { name: '48 active, 16 inactive, 16 pending users' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'View active users' }).click()
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('active')
  await expect(page.getByText('Showing 1–10 of 48 users')).toBeVisible()
  await page.getByRole('link', { name: 'Overview', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('Updated')
  await expect(
    page
      .getByRole('region', { name: 'Recently joined' })
      .locator('[aria-busy]'),
  ).toHaveAttribute('aria-busy', 'false')
  await page.screenshot({
    path: 'test-results/overview-desktop.png',
    fullPage: true,
  })
  await page.getByRole('link', { name: 'View users' }).click()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  await page.getByRole('button', { name: 'Refresh users' }).click()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  await expect
    .poll(() =>
      page
        .locator('tbody img')
        .first()
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0)
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Page 2 of 8')).toBeVisible()
  await page.getByLabel('Search users by name or email').fill('Amara')
  await expect(page.getByText('Showing 1–1 of 1 users')).toBeVisible()
  await page.getByLabel('Status', { exact: true }).selectOption('active')
  await expect(page.getByText('Showing 1–1 of 1 users')).toBeVisible()
  await expect(page).toHaveURL(/status=active/)
  await page.goBack()
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('')
  await page.getByLabel('Search users by name or email').fill('%')
  await expect(
    page.getByRole('heading', { name: 'No users match your filters' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).first().click()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  await page.screenshot({
    path: 'test-results/users-desktop.png',
    fullPage: true,
  })
  await page.getByLabel('Rows per page').selectOption('25')
  await expect(page.getByText('Showing 1–25 of 80 users')).toBeVisible()
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sign in to your workspace' }),
  ).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/login$/)
  await expect(page.getByRole('table')).not.toBeVisible()
  await page.reload()
  await expect(page).toHaveURL(/login$/)
  expect(
    await page.evaluate(() => sessionStorage.getItem('credisure.session.v1')),
  ).toBeNull()
})

test('invalid credentials, protected deep link and refresh behavior', async ({
  page,
}) => {
  await page.goto('/users')
  await expect(page).toHaveURL(/login$/)
  for (const width of [320, 375, 768, 1024, 1440, 1920]) {
    await page.setViewportSize({ width, height: 936 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    await expect(page.getByRole('button', { name: /^Sign in$/ })).toBeVisible()
    if (width >= 1024) {
      expect(
        await page.evaluate(
          () => document.documentElement.scrollHeight <= innerHeight,
        ),
      ).toBe(true)
    }
  }
  await expect(page.locator('.brand img')).toHaveAttribute(
    'src',
    '/credisure.webp',
  )
  await expect
    .poll(() =>
      page
        .locator('.brand img')
        .evaluate((image: HTMLImageElement) => image.naturalWidth),
    )
    .toBeGreaterThan(0)
  await page.screenshot({
    path: 'test-results/login-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({
    path: 'test-results/login-mobile.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.getByLabel('Email address').fill(process.env.E2E_ADMIN_EMAIL!)
  await page.getByLabel('Password', { exact: true }).fill('incorrect')
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Email or password is incorrect.',
  )
  await signIn(page)
  let repeatLogins = 0
  page.on('request', (request) => {
    if (request.url().endsWith('/api/auth/login')) repeatLogins += 1
  })
  const originalExpiry = await page.evaluate(
    () =>
      JSON.parse(sessionStorage.getItem('credisure.session.v1')!).expires_at,
  )
  await page.reload()
  await expect(page).toHaveURL(/overview$/)
  await expect(page.getByRole('status')).toContainText('Updated')
  await page.getByRole('link', { name: 'View users', exact: true }).click()
  await page.getByLabel('Status', { exact: true }).selectOption('active')
  await expect(page.getByText('Showing 1–10 of 48 users')).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Showing 11–20 of 48 users')).toBeVisible()
  const directoryUrl = page.url()
  await page.reload()
  await expect(page).toHaveURL(directoryUrl)
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('active')
  await expect(page.getByText('Showing 11–20 of 48 users')).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        JSON.parse(sessionStorage.getItem('credisure.session.v1')!).expires_at,
    ),
  ).toBe(originalExpiry)
  expect(repeatLogins).toBe(0)
  await page.evaluate(() => {
    const value = JSON.parse(sessionStorage.getItem('credisure.session.v1')!)
    value.expires_at = new Date(Date.now() - 1000).toISOString()
    sessionStorage.setItem('credisure.session.v1', JSON.stringify(value))
  })
  await page.reload()
  await expect(page).toHaveURL(/login$/)
  await expect(page.getByRole('status')).toContainText(
    'Your saved session has ended',
  )
})

test('responsive layout, keyboard drawer, local table scrolling and reduced motion', async ({
  page,
}) => {
  await signIn(page)
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.screenshot({
    path: 'test-results/overview-mobile.png',
    fullPage: true,
  })
  const menu = page.getByRole('button', { name: 'Open navigation' })
  await menu.click()
  const dialog = page.getByRole('dialog', { name: 'Navigation menu' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  expect(
    await page.evaluate(
      () =>
        !!document.querySelector('dialog')?.contains(document.activeElement),
    ),
  ).toBe(true)
  await page.keyboard.press('Tab')
  await expect(
    dialog.getByRole('button', { name: 'Close navigation' }),
  ).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(menu).toBeFocused()
  await menu.click()
  await dialog.getByRole('link', { name: 'Users' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
  }
  await page.setViewportSize({ width: 375, height: 812 })
  await page.screenshot({
    path: 'test-results/users-mobile.png',
    fullPage: true,
  })
  await menu.click()
  await page.mouse.click(360, 300)
  await expect(dialog).not.toBeVisible()
  await page.setViewportSize({ width: 812, height: 375 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.evaluate(() => {
    document.body.style.zoom = '2'
  })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
})

test('simulated server failure shows failed request and retry restores real results', async ({
  page,
}) => {
  await signIn(page)
  await page.route('**/api/users?*', (route) =>
    route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'internal_error', message: 'Temporary test failure.' },
      }),
    }),
  )
  await page.getByRole('link', { name: 'View users' }).click()
  await expect(page.getByRole('status')).toContainText('Failed')
  await expect(page.getByRole('alert')).toContainText('Temporary test failure.')
  await page.unroute('**/api/users?*')
  await page.getByRole('button', { name: 'Retry' }).click()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Updated')
})

test('simulated unauthorized response clears protected data', async ({
  page,
}) => {
  await signIn(page)
  await page.route('**/api/users?*', (route) =>
    route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        error: { code: 'unauthorized', message: 'Session expired.' },
      }),
    }),
  )
  await page.getByRole('link', { name: 'View users' }).click()
  await expect(page).toHaveURL(/login$/)
  await expect(page.getByRole('status')).toContainText(
    'Your session has ended.',
  )
})

test('simulated zero data, slow request, not-found and failed logout recovery', async ({
  page,
}) => {
  await page.route('**/api/users?*', (route) =>
    route.fulfill({
      json: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
    }),
  )
  await page.route('**/api/dashboard/summary', (route) =>
    route.fulfill({
      json: {
        total_users: 0,
        active_users: 0,
        inactive_users: 0,
        pending_users: 0,
      },
    }),
  )
  await signIn(page)
  await expect(page.getByLabel('User summary').locator('strong')).toHaveText([
    '0',
    '0',
    '0',
    '0',
  ])
  await page.evaluate(() => {
    history.pushState({}, '', '/missing')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(
    page.getByRole('heading', { name: 'Page not found' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Back to overview' }).click()
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/users?*', async (route) => {
    await gate
    await route.fulfill({
      json: { items: [], total: 0, page: 1, page_size: 10, total_pages: 0 },
    })
  })
  await page.getByRole('link', { name: 'View users' }).click()
  await expect(page.getByRole('status')).toContainText('Loading')
  await expect(
    page.getByRole('region', { name: /Users table/ }),
  ).toHaveAttribute('aria-busy', 'true')
  release()
  await expect(
    page.getByRole('heading', { name: 'No users yet' }),
  ).toBeVisible()
  await expect(page.getByText('No pages', { exact: true })).toBeVisible()
  await page.getByLabel('Search users by name or email').fill('anything')
  await expect(
    page.getByRole('heading', { name: 'No users match your filters' }),
  ).toBeVisible()
  await page.route('**/api/auth/logout', (route) => route.abort('failed'))
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sign in to your workspace' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText(
    'Server session revocation could not be confirmed',
  )
})

test('simulated portrait failure keeps initials and directory names usable', async ({
  page,
}) => {
  await page.route('**/images/demo-portraits.webp', (route) =>
    route.abort('failed'),
  )
  await signIn(page)
  const recent = page.getByRole('region', { name: 'Recently joined' })
  await expect(recent.locator('img').first()).toBeHidden()
  await expect(recent.getByText('Umar Suleiman')).toBeVisible()
  await page.getByRole('link', { name: 'View users', exact: true }).click()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  await expect(page.locator('tbody img').first()).toBeHidden()
  await expect(page.locator('tbody tr').first().getByText('US')).toBeVisible()
  await expect(
    page.locator('tbody tr').first().getByText('Umar Suleiman'),
  ).toBeVisible()
})

test('server-revoked sessions cannot restore the admin panel after reload', async ({
  page,
}) => {
  await signIn(page)
  const token = await page.evaluate(
    () =>
      JSON.parse(sessionStorage.getItem('credisure.session.v1')!).access_token,
  )
  const logout = await page.request.post('/api/auth/logout', {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(logout.status()).toBe(204)
  await page.reload()
  await expect(page).toHaveURL(/login$/)
  await expect(page.getByRole('status')).toContainText('Your session has ended')
  expect(
    await page.evaluate(() => sessionStorage.getItem('credisure.session.v1')),
  ).toBeNull()
  await expect(
    page.getByRole('heading', { name: 'A little clarity for your day.' }),
  ).not.toBeVisible()
})

test('temporary restoration failure preserves the route and supports retry', async ({
  page,
}) => {
  await signIn(page)
  await page.route('**/api/auth/me', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: 'unavailable',
          message: 'Temporary validation failure.',
        },
      },
    }),
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'We couldn’t restore your session' }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toHaveText(
    'Temporary validation failure.',
  )
  await expect(page).toHaveURL(/overview$/)
  await expect(
    page.getByRole('heading', { name: 'A little clarity for your day.' }),
  ).not.toBeVisible()
  await page.unroute('**/api/auth/me')
  await page.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'A little clarity for your day.' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Updated')
})
