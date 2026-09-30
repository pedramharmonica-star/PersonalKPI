export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {
    colors: {
      canvas: '#14161B',
      surface: 'rgba(255,255,255,0.055)',
      ink: { DEFAULT: '#ECEEF1', 700: '#D5D8DD', 600: '#C3C8CF', 300: '#8B929C' },
      paper: 'rgba(255,255,255,0.045)',
      line: 'rgba(255,255,255,0.10)',
      mute: '#9AA1AB',
      brand: { DEFAULT: '#F26122', 600: '#D9531A', 400: '#FF7A3D', 300: '#FF9B6B', 50: 'rgba(242,97,34,0.14)' },
      firouzeh: { DEFAULT: '#1DB5A8', 50: 'rgba(29,181,168,0.13)', 100: 'rgba(29,181,168,0.22)', 700: '#5FD6CB' },
      nil: { DEFAULT: '#7FA3C0', 50: 'rgba(127,163,192,0.14)' },
      saffron: { DEFAULT: '#E9A92E', 50: 'rgba(245,184,61,0.13)', 700: '#F7C766' },
      anar: { DEFAULT: '#E35D5D', 50: 'rgba(227,93,93,0.14)' },
      dim: { task: '#EEC56A', team: '#7FA3C0', ind: '#E35D5D', org: '#1DB5A8' },
    },
    fontFamily: { sans: ['YekanBakh', 'Tahoma', 'sans-serif'] },
  } },
  plugins: [],
};
