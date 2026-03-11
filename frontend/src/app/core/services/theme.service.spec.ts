import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  const storage: Record<string, string> = {};

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      value: vi.fn().mockImplementation(() => ({ matches: false, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() })),
      writable: true,
    });
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => storage[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
      storage[key] = value;
    });
    const classList = { add: vi.fn(), remove: vi.fn(), toggle: vi.fn(), contains: vi.fn(() => false), length: 0, item: () => null, addEventListener: vi.fn(), removeEventListener: vi.fn() };
    vi.spyOn(document.documentElement, 'classList', 'get').mockReturnValue(classList as unknown as DOMTokenList);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have theme signal', () => {
    expect(service.theme).toBeDefined();
  });

  it('should have isDark computed', () => {
    expect(service.isDark).toBeDefined();
  });

  it('setTheme should update theme and persist to localStorage', () => {
    service.setTheme('dark');
    expect(service.theme()).toBe('dark');
    expect(service.isDark()).toBe(true);
    expect(Storage.prototype.setItem).toHaveBeenCalledWith('dashboard_theme', 'dark');

    service.setTheme('light');
    expect(service.theme()).toBe('light');
    expect(service.isDark()).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('dashboard_theme', 'light');
  });

  it('toggle should switch between light and dark', () => {
    service.setTheme('light');
    service.toggle();
    expect(service.theme()).toBe('dark');
    service.toggle();
    expect(service.theme()).toBe('light');
  });
});
