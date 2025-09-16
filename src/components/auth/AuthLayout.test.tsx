import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthLayout } from './AuthLayout'
import { TEST_CONSTANTS } from '../../test/test-utils'

// Helper function to render AuthLayout with common patterns
const renderAuthLayout = (title: string, children: React.ReactNode) => {
  return render(
    <AuthLayout title={title}>
      {children}
    </AuthLayout>
  )
}

// Helper function to get title element
const getTitleElement = () => screen.getByRole('heading', { level: 2 })

describe('AuthLayout', () => {
  it('should render title and children', () => {
    renderAuthLayout(TEST_CONSTANTS.SIGN_IN_TITLE, <div>{TEST_CONSTANTS.FORM_CONTENT}</div>)

    expect(getTitleElement()).toHaveTextContent(TEST_CONSTANTS.SIGN_IN_TITLE)
    expect(screen.getByText(TEST_CONSTANTS.FORM_CONTENT)).toBeInTheDocument()
  })

  it('should render with different titles', () => {
    renderAuthLayout('Create Account', <div>Registration form</div>)

    expect(getTitleElement()).toHaveTextContent('Create Account')
  })

  it('should render multiple children', () => {
    renderAuthLayout('Test Title', (
      <>
        <div>Child 1</div>
        <div>Child 2</div>
        <span>Child 3</span>
      </>
    ))

    expect(screen.getByText('Child 1')).toBeInTheDocument()
    expect(screen.getByText('Child 2')).toBeInTheDocument()
    expect(screen.getByText('Child 3')).toBeInTheDocument()
  })

  it('should render complex children content', () => {
    renderAuthLayout('Complex Form', (
      <form>
        <input type="email" placeholder="Email" />
        <button type="submit">Submit</button>
      </form>
    ))

    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  })

  it('should apply correct CSS classes to container', () => {
    const { container } = render(
      <AuthLayout title="Test">
        <div>Content</div>
      </AuthLayout>
    )

    const mainContainer = container.firstChild as HTMLElement
    expect(mainContainer).toHaveClass(
      'min-h-screen',
      'flex',
      'items-center',
      'justify-center',
      'bg-gray-50',
      'py-12',
      'px-4',
      'sm:px-6',
      'lg:px-8'
    )
  })

  it('should apply correct CSS classes to content wrapper', () => {
    const { container } = render(
      <AuthLayout title="Test">
        <div>Content</div>
      </AuthLayout>
    )

    const contentWrapper = container.querySelector('.max-w-md.w-full.space-y-8')
    expect(contentWrapper).toBeInTheDocument()
    expect(contentWrapper).toHaveClass('max-w-md', 'w-full', 'space-y-8')
  })

  it('should apply correct CSS classes to title', () => {
    renderAuthLayout('Styled Title', <div>Content</div>)

    expect(getTitleElement()).toHaveClass(
      'mt-6',
      'text-center',
      'text-3xl',
      'font-extrabold',
      'text-gray-900'
    )
  })

  it('should handle empty title', () => {
    renderAuthLayout('', <div>Content</div>)

    const title = getTitleElement()
    expect(title).toHaveTextContent('')
    expect(title).toBeInTheDocument()
  })

  it('should handle title with special characters', () => {
    renderAuthLayout('Sign In & Register', <div>Content</div>)

    expect(getTitleElement()).toHaveTextContent('Sign In & Register')
  })

  it('should handle title with HTML entities', () => {
    renderAuthLayout('Sign In &amp; Register', <div>Content</div>)

    expect(getTitleElement()).toHaveTextContent('Sign In &amp; Register')
  })

  it('should maintain proper semantic structure', () => {
    render(
      <AuthLayout title="Semantic Test">
        <main>
          <section>Form section</section>
        </main>
      </AuthLayout>
    )

    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByText('Form section')).toBeInTheDocument()
  })

  it('should render with nested React components as children', () => {
    const ChildComponent = () => <div data-testid="child-component">Child Component</div>

    render(
      <AuthLayout title="With Component">
        <ChildComponent />
      </AuthLayout>
    )

    expect(screen.getByTestId('child-component')).toBeInTheDocument()
    expect(screen.getByText('Child Component')).toBeInTheDocument()
  })
})