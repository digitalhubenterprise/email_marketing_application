import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error inside React tree:", error, errorInfo);
    const errStr = error ? error.toString() : "";
    if (
      errStr.includes("Failed to fetch dynamically imported module") ||
      errStr.includes("Importing a module script failed") ||
      errStr.includes("dynamically imported module")
    ) {
      const reloaded = sessionStorage.getItem("chunk_reload_attempt");
      if (!reloaded) {
        sessionStorage.setItem("chunk_reload_attempt", "true");
        window.location.reload();
      }
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden font-sans text-white">
          {/* Glowing background shapes */}
          <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-rose-500/5 rounded-full filter blur-[100px] animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-500/5 rounded-full filter blur-[100px] animate-pulse delay-1000" />

          <div className="w-full max-w-md glass-panel p-8 rounded-3xl relative z-10 border border-dark-700/50 shadow-2xl text-center space-y-6 animate-scaleUp">
            <div className="h-14 w-14 bg-rose-500/10 rounded-2xl mx-auto flex items-center justify-center text-rose-400 border border-rose-500/20 shadow-lg shadow-rose-500/5">
              <AlertTriangle size={28} />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">Something went wrong</h1>
              <p className="text-xs text-dark-400 max-w-sm mx-auto leading-relaxed">
                An unexpected client-side error occurred inside the rendering tree. The interface has been gated to prevent instability.
              </p>
            </div>

            {this.state.error && (
              <div className="p-4 bg-dark-900/40 border border-dark-700/30 rounded-2xl text-left max-h-32 overflow-y-auto">
                <p className="text-[10px] text-rose-400 font-mono break-all leading-normal">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl brand-gradient-bg hover:opacity-95 text-[11px] font-bold text-white transition-all shadow-md shadow-brand-500/10 flex items-center justify-center gap-2 mx-auto"
              >
                <RefreshCw size={12} />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
