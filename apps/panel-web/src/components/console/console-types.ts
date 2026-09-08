import type { ConsoleLineKind } from '../../lib/console-buffer';

export const LINE_KIND_CLASS: Record<ConsoleLineKind, string> = {
  stdout: 'ds-con-line--stdout',
  install: 'ds-con-line--install',
  system: 'ds-con-line--system',
  error: 'ds-con-line--error',
};
