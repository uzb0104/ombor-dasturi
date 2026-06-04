import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.hash = "#/";
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4 text-foreground">
          <div className="max-w-md w-full border bg-card rounded-2xl p-6 shadow-lg flex flex-col items-center text-center gap-4">
            <div className="h-12 w-12 bg-destructive/10 text-destructive rounded-full grid place-items-center">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold">Kutilmagan xatolik yuz berdi</h2>
              <p className="text-xs text-muted-foreground">
                Dastur ishlashida xatolik aniqlandi. Iltimos, sahifani yangilab ko'ring yoki bosh
                sahifaga qayting.
              </p>
            </div>

            {this.state.error && (
              <div className="w-full bg-muted/50 border rounded-lg p-3 text-left font-mono text-[10px] text-muted-foreground overflow-x-auto max-h-32">
                {this.state.error.toString()}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 w-full mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="text-xs h-9"
              >
                Bosh sahifa
              </Button>
              <Button size="sm" onClick={this.handleReload} className="text-xs h-9">
                <RefreshCcw className="h-3.5 w-3.5 mr-1.5" />
                Sahifani yangilash
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
