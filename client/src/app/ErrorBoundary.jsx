import { Component } from "react";

/** Last-resort crash screen so users never see a blank page. */
class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Unhandled UI error:", error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crashScreen" role="alert">
        <div className="crashScreen__card">
          <h1>Something broke on our side</h1>
          <p>
            The app hit an unexpected error. Your room and its code are still
            on the server — reloading will take you right back.
          </p>
          <button
            className="btn btn--primary"
            onClick={() => window.location.reload()}
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
