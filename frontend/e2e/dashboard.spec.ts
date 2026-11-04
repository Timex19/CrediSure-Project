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
}

test('real API: login, overview, directory filters, pages, history and logout', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await signIn(page)
  await expect(page.getByLabel('User summary')).toContainText('80')
  await page.screenshot({
    path: 'test-results/overview-desktop.png',
    fullPage: true,
  })
  await page.getByRole('link', { name: 'View users' }).click()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  await page.getByRole('button', { name: 'Next page' }).click()
  await expect(page.getByText('Page 2 of 8')).toBeVisible()
  await page.getByLabel('Search users by name or email').fill('Amara')
  await expect(page.getByText('Showing 1–5 of 5 users')).toBeVisible()
  await page.getByLabel('Status', { exact: true }).selectOption('active')
  await expect(page.getByText('Showing 1–3 of 3 users')).toBeVisible()
  await expect(page).toHaveURL(/status=active/)
  await page.goBack()
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('')
  await page.getByLabel('Search users by name or email').fill('%')
  await expect(
    page.getByRole('heading', { name: 'No users match your filters' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).first().click()
  await expect(page.getByText('Showing 1–10 of 80 users')).toBeVisible()
  await page.getByLabel('Rows per page').selectOption('25')
  await expect(page.getByText('Showing 1–25 of 80 users')).toBeVisible()
  await page.screenshot({
    path: 'test-results/users-desktop.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(
    page.getByRole('heading', { name: 'Sign in to your workspace' }),
  ).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/login$/)
  await expect(page.getByRole('table')).not.toBeVisible()
})

test('invalid credentials, protected deep link and refresh behavior', async ({
  page,
}) => {
  await page.goto('/users')
  await expect(page).toHaveURL(/login$/)
  await page.screenshot({
    path: 'test-results/login-desktop.png',
    fullPage: true,
  })
  await page.getByLabel('Email address').fill(process.env.E2E_ADMIN_EMAIL!)
  await page.getByLabel('Password', { exact: true }).fill('incorrect')
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await expect(page.getByRole('alert')).toHaveText(
    'Email or password is incorrect.',
  )
  await signIn(page)
  await page.reload()
  await expect(page).toHaveURL(/login$/)
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
