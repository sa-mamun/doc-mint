export type ThemePreference = 'system' | 'light' | 'dark';

export const palettes = {
  light: {
    background: '#F5F7FB', surface: '#FFFFFF', text: '#18243A', muted: '#626F85',
    border: '#E1E6F0', primary: '#335CDE', onPrimary: '#FFFFFF', soft: '#EAF0FF',
    hero: '#1A2945', heroText: '#F5F8FF', heroAccent: '#ADC4FF', danger: '#B63C45',
  },
  dark: {
    background: '#101725', surface: '#192337', text: '#EDF2FB', muted: '#A7B5CC',
    border: '#2B3950', primary: '#9CB7FF', onPrimary: '#162B53', soft: '#283956',
    hero: '#1F304E', heroText: '#F3F6FF', heroAccent: '#B9CEFF', danger: '#FFADB5',
  },
};

export type Palette = typeof palettes.light;
