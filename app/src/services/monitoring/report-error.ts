export type ErrorReport = {
  error: unknown;
  componentStack?: string;
};

type ErrorReporter = (report: ErrorReport) => void;

let reporter: ErrorReporter = (report) => {
  console.error(report.error);
};

export function setErrorReporter(next: ErrorReporter) {
  reporter = next;
}

export function reportError(report: ErrorReport) {
  reporter(report);
}
