import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }

type State = { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            minHeight: '100vh',
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#f8fafc',
            color: '#0f172a',
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Lỗi khi chạy ứng dụng</h1>
          <pre
            style={{
              whiteSpace: 'pre-wrap',
              fontSize: 13,
              background: '#fff',
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
            }}
          >
            {this.state.error.message}
          </pre>
          <p style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>
            Mở DevTools (F12) → tab Console để xem stack đầy đủ.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
