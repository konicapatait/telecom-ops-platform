import { createLogger, sessionId, setLogLevel, setLogSink, type LogEntry } from './platform-log';

describe('platform log', () => {
  afterEach(() => {
    setLogLevel('info');
    setLogSink(null);
    vi.restoreAllMocks();
  });

  it('writes one consistent line with source, level and context', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    createLogger('federation').info('Remote loaded', { remote: 'mfe-fraud' });
    expect(info).toHaveBeenCalledWith(
      expect.stringMatching(/^\[platform\] \d\d:\d\d:\d\d\.\d{3} INFO {2}federation +Remote loaded$/),
      {
        remote: 'mfe-fraud',
      },
    );
  });

  it('drops entries below the threshold and lets debug through when enabled', () => {
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    createLogger('x').debug('hidden');
    expect(debug).not.toHaveBeenCalled();
    setLogLevel('debug');
    createLogger('x').debug('shown');
    expect(debug).toHaveBeenCalledTimes(1);
  });

  it('ships only warn/error to the sink, with the session id', () => {
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const shipped: LogEntry[] = [];
    setLogSink((e) => shipped.push(e));
    const log = createLogger('shell');
    log.info('not shipped');
    log.warn('shipped', { a: 1 });
    expect(shipped).toEqual([
      expect.objectContaining({ level: 'warn', source: 'shell', message: 'shipped', sessionId }),
    ]);
  });
});
