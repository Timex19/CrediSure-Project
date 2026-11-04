import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { UserAvatar } from './UserAvatar'

it('keeps readable initials when the portrait fails without duplicating the adjacent name', () => {
  const { container } = render(<UserAvatar id={1} name="Amara Okafor" />)
  const image = container.querySelector('img')!
  expect(image).toHaveAttribute('loading', 'lazy')
  fireEvent.error(image)
  expect(image).not.toBeVisible()
  expect(screen.getByText('AO')).toBeVisible()
  expect(image.closest('[aria-hidden="true"]')).not.toBeNull()
})
